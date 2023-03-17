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

  async makeRequest(options, changeHost = false) {
    if (changeHost) {
      this.host = HOSTS[+!HOSTS.indexOf(this.host)];
    }

    const request = {
      ...options,
      baseURL: `https://${this.host}/`,
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
      if (!changeHost) {
        const { status } = error.response || {};

        // Retry with a different hostname.
        if (status > 499) {
          return this.makeRequest(options, true);
        }

        // Cookie expired and need to be refreshed.
        if (status === 401 && !options.refreshingCookies) {
          await this.refreshCookies();
          return this.makeRequest(options);
        }
      }

      // Already tried a different hostname or got HTTP 300-400.
      throw error;
    }
  }

  async refreshCookies() {
    const { headers } = await this.makeRequest({
      method: 'get',
      url: '/auth/token',
      refreshingCookies: true,
    });

    this.setCookies(headers['set-cookie']);
  }

  setCookies(cookies) {
    this.cookies = cookies && cookies.map((cookie) => cookie.split(';')[0]);
  }

  getCookie(prefix) {
    return this.cookies.find((cookie) => cookie.startsWith(prefix));
  }

  client(request) {
    const requestRef = JSON.stringify(request);
    let promise = this.promises[requestRef];
    if (promise) {
      return promise;
    }

    promise = this.makeRequest({
      method: 'post',
      url: '/graphql',
      data: request,
    })
      .then(({ data: { data } }) => {
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
    this.setCookies(headers['set-cookie']);

    if (this.getCookie('vs-stepup')) {
      // 1. Start MFA flow, request code.
      await this.makeRequest({
        method: 'post',
        url: '/auth/mfa',
      });
    }

    return this.cookies;
  }

  async getInstallations() {
    const { account: { installations } } = await this.client({
      operationName: 'fetchAllInstallations',
      variables: { email: this.email },
      query: `query fetchAllInstallations($email: String!){
        account(email: $email) {
          installations {
            giid
            alias
            customerType
            dealerId
            subsidiary
            pinCodeLength
            locale
            address {
              street
              city
              postalNumber
              __typename
            }
            __typename
          }
          __typename
        }
      }`,
    });

    return installations
      .map((installation) => new VerisureInstallation(installation, this.client.bind(this)));
  }
}

module.exports = Verisure;
