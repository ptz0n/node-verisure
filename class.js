const request = require('request');
const striptags = require('striptags');

const HOSTS = [
  'e-api01.verisure.com',
  'e-api02.verisure.com',
];

class VerisureInstallation {
  constructor(installation, client) {
    this.giid = installation.giid;
    this.baseClient = client;
  }

  client(options) {
    return this.baseClient({ ...options, uri: `/installation/${this.giid}/${options.uri}` });
  }

  getOverview() {
    return this.client({ uri: 'overview' });
  }
}

class Verisure {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    [this.host] = HOSTS;
  }

  client(options, retrying = false) {
    if (retrying) {
      this.host = HOSTS[0] === this.host ? HOSTS[1] : HOSTS[0];
    }

    const requestOptions = {
      ...options,
      baseUrl: `https://${this.host}/xbn/2/`,
      headers: options.headers || {},
    };
    requestOptions.headers.Host = this.host;

    return new Promise((resolve, reject) => {
      request(requestOptions, (err, res, body) => {
        if (err) return reject(err);
        if (res.statusCode > 499 && !retrying) {
          return this.client(options, true);
        }
        return resolve(body);
      });
    });
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
    }).then((body) => {
      this.token = striptags(body).trim();
      return this.token;
    });
  }

  getInstallations() {
    return this.client({ uri: `/installation/search?email=${this.email}`, json: true })
      .then(installations =>
        installations.map(installation => new VerisureInstallation(installation, this.client)));
  }
}

module.exports = Verisure;
