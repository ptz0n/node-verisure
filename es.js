const axios = require('axios');
const { parseStringPromise } = require('xml2js');

const client = axios.create({
  baseURL: 'https://mob2217.securitasdirect.es:12010/WebService/ws.do',
});

client.interceptors.response.use(async (response) => {
  const data = await parseStringPromise(response.data);

  if (!data.PET || data.PET.RES[0] !== 'OK') {
    const error = new Error('Unknown response');
    error.response = {
      ...response,
      data,
    };
    error.config = response.config;

    return Promise.reject(error);
  }

  return data.PET;
});

const sleep = (seconds) => new Promise((resolve) => {
  setTimeout(resolve, seconds * 1000);
});

const buildId = (user) => {
  const date = new Date().toISOString().substring(0, 19).replace(/\D/g, '');
  return `IPH_________________________${user}${date}`;
};

// const supportedCountries = ['es', 'fr', 'pt']

class SecuritasDirect {
  constructor(username, password, country) {
    this.params = {
      Country: country.toUpperCase(),
      ID: buildId(username),
      lang: country,
      pwd: password,
      user: username,
    };
  }

  login() {
    return client({
      method: 'POST',
      params: {
        ...this.params,
        request: 'LOGIN',
      },
    }).then(({ HASH }) => {
      [this.params.hash] = HASH;
      return this.params.hash;
    });
  }

  logout() {
    return client({
      method: 'GET',
      params: {
        ...this.params,
        request: 'CLS',
        numinst: '',
      },
    });
  }

  getInstallation(installation) {
    return client({
      method: 'POST',
      params: {
        ...this.params,
        request: 'MYINSTALLATION',
        numinst: installation,
      },
    }).then(({ INSTALLATION }) => INSTALLATION[0]);
  }

  async transaction(action, installation, panel, retries = 0) {
    if (retries > 10) {
      return Promise.reject(new Error('Too many retries'));
    }

    const step = retries === 0 ? 1 : 2;

    const response = await client({
      method: 'GET',
      params: {
        ...this.params,
        numinst: installation,
        panel,
        request: `${action}${step}`,
      },
    }).catch(() => null);

    if (response && step === 2) {
      return response;
    }

    await sleep(2);

    return this.transaction(action, installation, panel, retries + 1);
  }
}

module.exports = SecuritasDirect;
