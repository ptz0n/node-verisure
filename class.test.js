const nock = require('nock');

const Verisure = require('./class');

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
      expect.assertions(3);
      expect(installations.length).toBe(1);

      const [installation] = installations;
      expect(installation.giid).toBe('123456789');
      expect(typeof installation.getOverview).toBe('function');
    });
  });
});
