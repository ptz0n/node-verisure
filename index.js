const axios = require('axios');

const VerisureInstallation = require('./installation');

const HOSTS = [
  'automation01.verisure.com',
  'automation02.verisure.com',
];

class Verisure {
  constructor(email, password, cookies = []) {
    [this.host] = HOSTS;
    this.email = email;
    this.password = password;
    this.promises = {};
    this.cookies = cookies;
  }

  async makeRequest(options, retrying = false) {
    const isAuth = options.url.startsWith('/auth');

    if (retrying) {
      this.host = HOSTS[+!HOSTS.indexOf(this.host)];
    }

    const request = {
      ...options,
      baseURL: isAuth
        ? `https://${this.host}/`
        : `https://${this.host}/xbn/2/`,
      headers: {
        'User-Agent': 'node-verisure',
        accept: 'application/json',
        ...(options.headers || {}),
      },
    };

    if (this.cookies) {
      request.headers.Cookie = this.cookies.join(';');
    }

    try {
      return await axios(request);
    } catch (error) {
      if (error.response && error.response.status > 499 && !retrying) {
        return this.makeRequest(options, true);
      }

      throw error;
    }
  }

  client(request) {
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

  getCookie(prefix) {
    return this.cookies.find((cookie) => cookie.startsWith(prefix));
  }

  async getToken(code) {
    let authRequest = {
      method: 'post',
      url: '/auth/login',
      auth: {
        username: this.email,
        password: this.password,
      },
    };

    if (code) {
      // 2. Continue MFA flow, send code.
      authRequest = {
        method: 'post',
        url: '/auth/mfa/validate',
        data: { token: code },
      };
    }

    const { headers } = await this.makeRequest(authRequest);

    const cookies = headers['set-cookie'];

    this.cookies = cookies && cookies.map((cookie) => cookie.split(';')[0]);

    if (this.getCookie('vs-stepup')) {
      // 1. Start MFA flow, request code.
      await this.makeRequest({
        method: 'post',
        url: '/auth/mfa',
      });
    }

    return this.cookies;
  }

  getInstallations() {
    return this.client({ url: `/installation/search?email=${this.email}` })
      .then((installations) => installations
        .map((installation) => new VerisureInstallation(installation, this.client.bind(this))));
  }
}

module.exports = Verisure;
