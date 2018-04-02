const nock = require('nock');

const Verisure = require('./index');

nock.disableNetConnect();
const scope = nock(/https:\/\/e-api0\d.verisure.com/);

describe('Verisure', () => {
  scope.get('/xbn/2/cookie').replyWithFile(200, `${__dirname}/test/responses/cookie.xml`);
  const verisure = new Verisure('email', 'password');

  it('should get token', () => {
    expect.assertions(1);
    return expect(verisure.getToken()).resolves.toEqual('myExampleToken');
  });

  it('should build credientials', () => {
    const credientials = verisure.buildCredientials();
    expect.assertions(1);
    expect(credientials).toBe('Q1BFL2VtYWlsOnBhc3N3b3Jk');
  });

  it('should get installations', () => {
    scope.get(`/xbn/2/installation/search?email=${verisure.email}`)
      .replyWithFile(200, `${__dirname}/test/responses/installations.json`);

    return verisure.getInstallations().then((installations) => {
      expect.assertions(5);
      expect(installations.length).toBe(1);

      const [installation] = installations;
      expect(installation.giid).toBe('123456789');
      expect(typeof installation.getOverview).toBe('function');

      scope.get(`/xbn/2/installation/${installation.giid}/overview`)
        .replyWithFile(200, `${__dirname}/test/responses/overview.json`);
      return installation.getOverview().then((overview) => {
        expect(typeof overview).toBe('object');
        expect(overview.armstateCompatible).toBeTruthy();
      });
    });
  });

  it('should retry once with different host', (done) => {
    expect(verisure.host).toEqual('e-api01.verisure.com');

    scope.get('/xbn/2/').reply(500, 'Not this one')
      .get('/xbn/2/').reply(200, 'Success');
    verisure.client({ uri: '/' }).then((body) => {
      expect(body).toBe('Success');
      expect(verisure.host).toEqual('e-api02.verisure.com');

      scope.get('/xbn/2/').reply(500, 'Still not this one')
        .get('/xbn/2/').reply(200, 'Success again');
      verisure.client({ uri: '/' }).then((secondBody) => {
        expect(secondBody).toBe('Success again');
        expect(verisure.host).toEqual('e-api01.verisure.com');

        done();
      });
    });
  });

  it('should reject on errors like timeouts etc', () => {
    scope.get('/xbn/2/').replyWithError('Oh no');
    return expect(verisure.client({ uri: '/' })).rejects.toThrowError('Oh no');
  });

  it('should reject on response code higher than 299', () => {
    scope.get('/xbn/2/').reply(300, 'Doh');
    return expect(verisure.client({ uri: '/' })).rejects.toThrowError('Doh');
  });
});
