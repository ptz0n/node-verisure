const axios = require('axios');
const { parseStringPromise } = require('xml2js');

const client = axios.create({
  baseURL: 'https://mob2217.securitasdirect.es:12010/WebService/ws.do',
});

client.interceptors.response.use((response) => parseStringPromise(response.data));

const buildId = (user) => {
  const date = new Date().toISOString().substring(0, 19).replace(/\D/g, '');
  return `IPH_________________________${user}${date}`;
};

const login = (username, password, country) => client({
  method: 'POST',
  params: {
    request: 'LOGIN',
    ID: buildId(username),
    country,
    lang: country.toUpperCase(),
    user: username,
    pwd: password,
  },
}).then(({ PET }) => PET.HASH[0]);

module.exports = {
  login,
};
