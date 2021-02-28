const axios = require('axios');

const VerisureInstallation = require('./installation');

const AUTH_HOSTS = [
  'automation01.verisure.com',
  'automation02.verisure.com',
];

const HOSTS = [
  'e-api01.verisure.com',
  'e-api02.verisure.com',
];

class Verisure {
  constructor(email, password) {
    [this.host] = HOSTS;
    [this.authHost] = AUTH_HOSTS;
    this.email = email;
    this.password = password;
    this.promises = {};
    this.cookie = null;
  }

  async makeRequest(options, retrying = false) {
    if (retrying) {
      if (options.auth) {
        this.authHost = AUTH_HOSTS[+!AUTH_HOSTS.indexOf(this.authHost)];
      } else {
        this.host = HOSTS[+!HOSTS.indexOf(this.host)];
      }
    }

    const request = {
      ...options,
      baseURL: options.auth
        ? `https://${this.authHost}/`
        : `https://${this.host}/xbn/2/`,
    };

    try {
      return await axios(request);
    } catch (error) {
      if (error.response && error.response.status > 499 && !retrying) {
        return this.makeRequest(options, true);
      }

      throw error;
    }
  }

  client(options) {
    const request = {
      ...options,
      headers: options.headers || {},
    };

    if (this.cookie) {
      request.headers.Cookie = this.cookie;
    }

    const requestRef = JSON.stringify(request);
    let promise = this.promises[requestRef];
    if (promise) {
      return promise;
    }

    promise = this.makeRequest(request)
      .then(({ data }) => {
        delete this.promises[requestRef];
        return data;
      })
      .catch((error) => {
        delete this.promises[requestRef];
        return Promise.reject(error);
      });

    this.promises[requestRef] = promise;
    return promise;
  }

  async getToken() {
    const { status, headers } = await this.makeRequest({
      url: '/auth/login',
      auth: {
        username: this.email,
        password: this.password,
      },
    });

    const cookies = headers['set-cookie'];

    this.cookie = cookies && cookies
      .map((cookie) => cookie.split(';')[0])
      .find((cookie) => cookie.startsWith('vid='));

    if (!this.cookie) {
      throw new Error(`Cookie missing from response: HTTP ${status}`);
    }

    return this.cookie.split('=')[1];
  }

  getInstallations() {
    return this.client({ url: `/installation/search?email=${this.email}` })
      .then((installations) => installations
        .map((installation) => new VerisureInstallation(installation, this.client.bind(this))));
  }
}

module.exports = Verisure;
