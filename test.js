const nock = require('nock');

const Verisure = require('.');

nock.disableNetConnect();

const mockedCookies = [
  'vid=myExampleToken',
  'vs-access=foo',
  'vs-refresh=bar',
];

const scope = nock(/https:\/\/automation0\d.verisure.com/, {
  reqheaders: {
    cookie: mockedCookies.join(';'),
  },
});

describe('Verisure', () => {
  const verisure = new Verisure('email', 'password');

  beforeEach(() => {
    verisure.cookies = mockedCookies;
  });

  it('should get token', async () => {
    const authScope = nock(/https:\/\/automation0\d.verisure.com/);

    // Verify retry on different host.
    authScope.post('/auth/login').reply(500, 'Not this one');

    authScope
      .post('/auth/login')
      .basicAuth({ user: 'email', pass: 'password' })
      .replyWithFile(200, `${__dirname}/test/responses/login.json`, {
        'Set-Cookie': 'vid=myExampleToken; Version=1; Path=/; Domain=verisure.com; Secure;',
      });

    const cookies = await verisure.getToken();

    expect.assertions(3);
    expect(cookies[0]).toEqual('vid=myExampleToken');
    expect(verisure.cookies[0]).toEqual('vid=myExampleToken');
    expect(verisure.host).toEqual('automation02.verisure.com');
  });

  it('should get step up token', async () => {
    const authScope = nock(/https:\/\/automation0\d.verisure.com/);

    authScope
      .post('/auth/login')
      .basicAuth({ user: 'email', pass: 'password' })
      .replyWithFile(200, `${__dirname}/test/responses/login.json`, {
        'Set-Cookie': 'vs-stepup=myStepUpToken; Version=1; Path=/; Domain=verisure.com; Secure;',
      });

    authScope
      .post('/auth/mfa')
      .reply(200, '');

    const [stepUpCookie] = await verisure.getToken();

    expect(stepUpCookie).toEqual('vs-stepup=myStepUpToken');
    expect(verisure.getCookie('vs-stepup')).toEqual('vs-stepup=myStepUpToken');

    authScope
      .post('/auth/mfa/validate', { token: 'ASD123' })
      .reply(200, '', {
        'Set-Cookie': [
          'vid=myToken; Version=1; Path=/; Domain=verisure.com; Secure;',
          'vs-access=myAccessToken; Version=1; Path=/; Domain=verisure.com; Secure;',
          'vs-refresh=myRefreshToken; Version=1; Path=/; Domain=verisure.com; Secure;',
        ],
      });

    const cookies = await verisure.getToken('ASD123');

    const expectedCookies = [
      'vid=myToken',
      'vs-access=myAccessToken',
      'vs-refresh=myRefreshToken',
    ];

    expect(cookies).toEqual(expectedCookies);
    expect(verisure.cookies).toEqual(expectedCookies);
  });

  it('should refresh cookies when expired', async () => {
    scope
      .get('/graphql').reply(500) // Time to switch hosts.
      .post('/graphql').reply(401)

      .get('/auth/token')
      .reply(200, '', {
        'Set-Cookie': [
          'vid=myNewToken; Version=1; Path=/; Domain=verisure.com; Secure;',
          'vs-access=myNewAccessToken; Version=1; Path=/; Domain=verisure.com; Secure;',
          'vs-refresh=myNewRefreshToken; Version=1; Path=/; Domain=verisure.com; Secure;',
        ],
      });

    nock(/https:\/\/automation0\d.verisure.com/)
      .matchHeader('cookie',
        'vid=myNewToken;vs-access=myNewAccessToken;vs-refresh=myNewRefreshToken')
      .post('/graphql')
      .reply(200, { data: 'datadata' });

    const response = await verisure.client({
      operation: 'something',
    });

    const expectedCookies = [
      'vid=myNewToken',
      'vs-access=myNewAccessToken',
      'vs-refresh=myNewRefreshToken',
    ];

    expect.assertions(2);
    expect(verisure.cookies).toEqual(expectedCookies);
    expect(response).toEqual('datadata');
  });

  it('should throw if unable to refresh cookies', () => {
    scope
      .post('/graphql').reply(401) // Expired cookies?
      .get('/auth/token').reply(401); // Failed to refresh.

    return expect(verisure.client({}))
      .rejects.toThrowError('Request failed with status code 401');
  });

  it('should throw if response contains errors', () => {
    scope.post('/graphql').reply(200, {
      errors: [{
        message: 'Syntax Error: Expected Name, found ")".',
        data: {
          status: 123,
        },
      }],
    });

    return expect(verisure.client({}))
      .rejects.toThrow('GraphQL response contains 1 errors');
  });

  it('should get installations', async () => {
    scope.post('/graphql')
      .replyWithFile(200, `${__dirname}/test/responses/fetch-all-installations.json`);

    const installations = await verisure.getInstallations();

    expect.assertions(5);
    expect(installations.length).toBe(1);

    const [installation] = installations;
    expect(installation.giid).toBe('123456789');
    expect(installation.locale).toBe('sv_SE');
    expect(installation.config.locale).toBe('sv_SE');

    scope.post('/graphql', { variables: { giid: '123456789' } })
      .replyWithFile(200, `${__dirname}/test/responses/broadband.json`);

    const broadband = await installation.client({});

    expect(typeof broadband).toBe('object');
  });

  it('should retry once with different host', async () => {
    expect.assertions(4);
    verisure.host = 'automation01.verisure.com';
    const url = '/graphql';

    scope
      .post(url).reply(200, {
        errors: [{
          message: 'Request Failed',
          data: {
            status: 503,
            errorGroup: 'SERVICE_UNAVAILABLE',
            errorCode: 'SYS_00004',
            errorMessage: 'XBN Database is not activated',
          },
        }],
      })
      .post(url).reply(200, { data: 'Success' });

    const firstResponse = await verisure.client({});
    expect(firstResponse).toBe('Success');
    expect(verisure.host).toEqual('automation02.verisure.com');

    scope
      .post(url).reply(500, 'Still not this one')
      .post(url).reply(200, { data: 'Success again' });

    const secondResponse = await verisure.client({});
    expect(secondResponse).toBe('Success again');
    expect(verisure.host).toEqual('automation01.verisure.com');
  });

  it('should reject on errors like timeouts etc', () => {
    scope.post('/graphql').replyWithError('Oh no');
    return expect(verisure.client({})).rejects.toThrowError('Oh no');
  });

  it('should reject on response code higher than 299', () => {
    scope.post('/graphql').reply(300, 'Doh');
    return expect(verisure.client({})).rejects.toThrowError('Request failed with status code 300');
  });

  it('should make one request when invoked in paralell', () => {
    scope.post('/graphql').reply(200, 'Only once');
    return Promise.all([
      verisure.client({}),
      verisure.client({}),
    ]);
  });
});
