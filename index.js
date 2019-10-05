const axios = require('axios');
const striptags = require('striptags');

const VerisureInstallation = require('./installation');

const HOSTS = [
  'e-api01.verisure.com',
  'e-api02.verisure.com',
];

class Verisure {
  constructor(email, password) {
    [this.host] = HOSTS;
    this.email = email;
    this.password = password;
    this.promises = {};
    this.token = null;
  }

  client(options, retrying = false) {
    if (retrying) {
      this.host = HOSTS[0] === this.host ? HOSTS[1] : HOSTS[0];
    }

    const requestOptions = Object.assign(options, {
      baseURL: `https://${this.host}/xbn/2/`,
      headers: options.headers || {},
    });

    requestOptions.headers.Host = this.host;
    if (this.token) {
      requestOptions.headers.Cookie = `vid=${this.token}`;
    }

    const requestRef = JSON.stringify(requestOptions);
    let promise = this.promises[requestRef];
    if (promise) {
      return promise;
    }

    promise = axios(requestOptions)
      .then(({ data }) => {
        delete this.promises[requestRef];
        return data;
      })
      .catch((error) => {
        delete this.promises[requestRef];

        if (error.response && error.response.status > 499 && !retrying) {
          return this.client(options, true);
        }

        return Promise.reject((error.response && error.response.data) || error);
      });

    this.promises[requestRef] = promise;
    return promise;
  }

  buildCredientials() {
    return Buffer.from(`CPE/${this.email}:${this.password}`, 'ascii').toString('base64');
  }

  getToken() {
    return this.client({
      url: '/cookie',
      headers: {
        'Content-Type': 'application/xml;charset=UTF-8',
        Authorization: `Basic ${this.buildCredientials()}`,
        Accept: 'text/plain',
      },
    }).then((body) => {
      this.token = striptags(body).trim();
      return this.token;
    });
  }

  getInstallations() {
    return this.client({ url: `/installation/search?email=${this.email}` })
      .then((installations) => installations
        .map((installation) => new VerisureInstallation(installation, this.client.bind(this))));
  }
}

module.exports = Verisure;
