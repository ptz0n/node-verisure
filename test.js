const nock = require('nock');

const Verisure = require('./index');

nock.disableNetConnect();

const scope = nock(/https:\/\/e-api0\d.verisure.com/, {
  reqheaders: {
    cookie: (value) => value === 'vid=myExampleToken',
  },
});

describe('Verisure', () => {
  const verisure = new Verisure('email', 'password');

  it('should get token', async () => {
    const authScope = nock(/https:\/\/automation0\d.verisure.com/);

    // Verify retry on different host.
    authScope.get('/auth/login').reply(500, 'Not this one');

    authScope
      .get('/auth/login')
      .basicAuth({ user: 'email', pass: 'password' })
      .replyWithFile(200, `${__dirname}/test/responses/login.json`, {
        'Set-Cookie': 'vid=myExampleToken; Version=1; Path=/; Domain=verisure.com; Secure;',
      });

    const token = await verisure.getToken();

    expect.assertions(3);
    expect(token).toEqual('myExampleToken');
    expect(verisure.cookie).toEqual('vid=myExampleToken');
    expect(verisure.authHost).toEqual('automation02.verisure.com');
  });

  it('should get installations', async () => {
    scope.get(`/xbn/2/installation/search?email=${verisure.email}`)
      .replyWithFile(200, `${__dirname}/test/responses/installations.json`);

    const installations = await verisure.getInstallations();

    expect.assertions(7);
    expect(installations.length).toBe(1);

    const [installation] = installations;
    expect(installation.giid).toBe('123456789');
    expect(installation.locale).toBe('sv_SE');
    expect(installation.config.locale).toBe('sv_SE');
    expect(typeof installation.getOverview).toBe('function');

    scope.get(`/xbn/2/installation/${installation.giid}/overview`)
      .replyWithFile(200, `${__dirname}/test/responses/overview.json`);

    const overview = await installation.getOverview();

    expect(typeof overview).toBe('object');
    expect(overview.armstateCompatible).toBeTruthy();
  });

  it('should retry once with different host', (done) => {
    expect(verisure.host).toEqual('e-api01.verisure.com');

    scope.get('/xbn/2/').reply(500, 'Not this one')
      .get('/xbn/2/').reply(200, 'Success');
    verisure.client({ url: '/' }).then((body) => {
      expect(body).toBe('Success');
      expect(verisure.host).toEqual('e-api02.verisure.com');

      scope.get('/xbn/2/').reply(500, 'Still not this one')
        .get('/xbn/2/').reply(200, 'Success again');
      verisure.client({ url: '/' }).then((secondBody) => {
        expect(secondBody).toBe('Success again');
        expect(verisure.host).toEqual('e-api01.verisure.com');

        done();
      });
    });
  });

  it('should reject on errors like timeouts etc', () => {
    scope.get('/xbn/2/').replyWithError('Oh no');
    return expect(verisure.client({ url: '/' })).rejects.toThrowError('Oh no');
  });

  it('should reject on response code higher than 299', () => {
    scope.get('/xbn/2/').reply(300, 'Doh');
    return expect(verisure.client({ url: '/' })).rejects.toThrowError('Request failed with status code 300');
  });

  it('should make one request when invoked in paralell', () => {
    scope.get('/xbn/2/').reply(200, 'Only once');
    const options = { url: '/' };
    return Promise.all([
      verisure.client(options),
      verisure.client(options),
    ]);
  });
});
