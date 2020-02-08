const axios = require('axios');
const { parseStringPromise } = require('xml2js');

// const supportedCountries = ['es', 'fr', 'pt']

const client = axios.create({
  baseURL: 'https://mob2217.securitasdirect.es:12010/WebService/ws.do',
});

client.interceptors.response.use(async (response) => {
  const data = await parseStringPromise(response.data);

  if (data.PET.RES[0] !== 'OK') {
    const error = new Error('Unknown response');
    error.response = {
      ...response,
      data,
    };
    error.config = response.config;

    return Promise.reject(error);
  }

  return data;
});

const buildId = (user) => {
  const date = new Date().toISOString().substring(0, 19).replace(/\D/g, '');
  return `IPH_________________________${user}${date}`;
};

const login = (username, password, country) => client({
  method: 'POST',
  params: {
    request: 'LOGIN',
    ID: buildId(username),
    Country: country.toUpperCase(),
    lang: country,
    user: username,
    pwd: password,
  },
}).then(({ PET }) => PET.HASH[0]);

module.exports = {
  login,
};
