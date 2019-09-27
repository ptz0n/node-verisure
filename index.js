const request = require('request');
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
      baseUrl: `https://${this.host}/xbn/2/`,
      headers: options.headers || {},
      json: typeof options.json === 'undefined' ? true : options.json,
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

    promise = new Promise((resolve, reject) => {
      request(requestOptions, (err, res, body) => {
        delete this.promises[requestRef];
        if (err) return reject(err);
        if (res.statusCode > 499 && !retrying) {
          return resolve(this.client(options, true));
        }
        if (res.statusCode > 299) {
          return reject(body);
        }
        return resolve(body);
      });
    });

    this.promises[requestRef] = promise;
    return promise;
  }

  buildCredientials() {
    return Buffer.from(`CPE/${this.email}:${this.password}`, 'ascii').toString('base64');
  }

  getToken() {
    return this.client({
      uri: '/cookie',
      headers: {
        'Content-Type': 'application/xml;charset=UTF-8',
        Authorization: `Basic ${this.buildCredientials()}`,
      },
      json: null,
    }).then((body) => {
      this.token = striptags(body).trim();
      return this.token;
    });
  }

  getInstallations() {
    return this.client({ uri: `/installation/search?email=${this.email}` })
      .then((installations) => installations
        .map((installation) => new VerisureInstallation(installation, this.client.bind(this))));
  }
}

module.exports = Verisure;
