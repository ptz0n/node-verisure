const nock = require('nock');
const tk = require('timekeeper');
const qs = require('qs');

const { login } = require('./es');

nock.disableNetConnect();
const scope = nock('https://mob2217.securitasdirect.es:12010/WebService/').log(console.log);

describe('ES', () => {
  test('login should get hash for user', async () => {
    tk.freeze(new Date('2020-02-06T21:02:54.868Z'));

    const query = qs.stringify({
      request: 'LOGIN',
      ID: 'IPH_________________________john20200206210254',
      Country: 'ES',
      lang: 'es',
      user: 'john',
      pwd: 'topsecret',
    });

    scope.post(`/ws.do?${query}`).replyWithFile(200, `${__dirname}/test/responses/hash.xml`);

    const hash = await login('john', 'topsecret', 'es');

    expect(hash).toBe('11111111111');
  });
});
