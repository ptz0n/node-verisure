const nock = require('nock');
const tk = require('timekeeper');

const SecuritasDirect = require('./es');

nock.disableNetConnect();
const scope = nock('https://mob2217.securitasdirect.es:12010/WebService/').log(console.log);

describe('ES', () => {
  tk.freeze(new Date('2020-02-06T21:02:54.868Z'));

  const params = {
    Country: 'ES',
    ID: 'IPH_________________________john20200206210254',
    lang: 'es',
    pwd: 'topsecret',
    user: 'john',
  };

  const client = new SecuritasDirect('john', 'topsecret', 'es');

  test('login should get hash for user', async () => {
    scope.post('/ws.do').query({
      ...params,
      request: 'LOGIN',
    }).replyWithFile(200, `${__dirname}/test/responses/LOGIN.xml`);

    const hash = await client.login();

    params.hash = hash;
    expect(hash).toBe('11111111111');
    expect(client.params.hash).toBe('11111111111');
  });

  test('should get installation', async () => {
    scope.post('/ws.do').query({
      ...params,
      numinst: '2423443',
      request: 'MYINSTALLATION',
    }).replyWithFile(200, `${__dirname}/test/responses/MYINSTALLATION.xml`);

    const installation = await client.getInstallation('2423443');

    expect(installation.DEVICES.length).toBe(1);
  });

  test('should get panel status', async () => {
    const query = {
      ...params,
      numinst: '2423443',
      panel: 'SDVFAST',
    };

    scope.get('/ws.do').query({
      ...query,
      request: 'EST1',
    }).replyWithFile(200, `${__dirname}/test/responses/EST1.xml`);

    scope.get('/ws.do').query({
      ...query,
      request: 'EST2',
    }).times(3).replyWithFile(200, `${__dirname}/test/responses/EST2-WAIT.xml`);

    scope.get('/ws.do').query({
      ...query,
      request: 'EST2',
    }).replyWithFile(200, `${__dirname}/test/responses/EST2.xml`);

    const { NUMINST, STATUS } = await client.transaction('EST', '2423443', 'SDVFAST');

    expect(NUMINST[0]).toBe('2423443');
    expect(STATUS[0]).toBe('0');
  }, 10000);
});
