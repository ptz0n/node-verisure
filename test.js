const fs = require('fs');
const path = require('path');
const { MockAgent } = require('undici');

const Verisure = require('.');

const ORIGIN = /^https:\/\/automation0\d\.verisure\.com$/;

const mockedCookies = [
  'vid=myExampleToken',
  'vs-access=foo',
  'vs-refresh=bar',
];

const basicAuthHeader = Buffer.from('email:password').toString('base64');

const readFixture = (name) => fs.readFileSync(path.join(__dirname, 'test/responses', name), 'utf8');

describe('Verisure', () => {
  let agent;
  let pool;
  let verisure;

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    pool = agent.get(ORIGIN);

    verisure = new Verisure('email', 'password', [], { dispatcher: agent });
    verisure.cookies = mockedCookies;
  });

  afterEach(() => agent.close());

  it('should get token', async () => {
    expect.assertions(3);

    // First host tried is unavailable, plugin should retry with the other one.
    pool.intercept({ path: '/auth/login', method: 'POST' }).reply(500, 'Not this one');
    pool.intercept({
      path: '/auth/login',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${basicAuthHeader}`,
      },
      body: '{}',
    }).reply(200, readFixture('login.json'), {
      headers: { 'set-cookie': 'vid=myExampleToken; Version=1; Path=/; Domain=verisure.com; Secure;' },
    });

    const cookies = await verisure.getToken();

    expect(cookies[0]).toEqual('vid=myExampleToken');
    expect(verisure.cookies[0]).toEqual('vid=myExampleToken');
    expect(verisure.host).toEqual('automation02.verisure.com');
  });

  it('should get step up token', async () => {
    pool.intercept({ path: '/auth/login', method: 'POST' }).reply(200, readFixture('login.json'), {
      headers: { 'set-cookie': 'vs-stepup=myStepUpToken; Version=1; Path=/; Domain=verisure.com; Secure;' },
    });
    pool.intercept({ path: '/auth/mfa', method: 'POST' }).reply(200, '');

    const [stepUpCookie] = await verisure.getToken();

    expect(stepUpCookie).toEqual('vs-stepup=myStepUpToken');
    expect(verisure.getCookie('vs-stepup')).toEqual('vs-stepup=myStepUpToken');

    pool.intercept({
      path: '/auth/mfa/validate',
      method: 'POST',
      body: JSON.stringify({ token: 'ASD123' }),
    }).reply(200, '', {
      headers: {
        'set-cookie': [
          'vid=myToken; Version=1; Path=/; Domain=verisure.com; Secure;',
          'vs-access=myAccessToken; Version=1; Path=/; Domain=verisure.com; Secure;',
          'vs-refresh=myRefreshToken; Version=1; Path=/; Domain=verisure.com; Secure;',
        ],
      },
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
    expect.assertions(2);

    pool.intercept({ path: '/graphql', method: 'POST' }).reply(401);
    pool.intercept({ path: '/auth/token', method: 'GET' }).reply(200, '', {
      headers: {
        'set-cookie': [
          'vid=myNewToken; Version=1; Path=/; Domain=verisure.com; Secure;',
          'vs-access=myNewAccessToken; Version=1; Path=/; Domain=verisure.com; Secure;',
          'vs-refresh=myNewRefreshToken; Version=1; Path=/; Domain=verisure.com; Secure;',
        ],
      },
    });
    pool.intercept({
      path: '/graphql',
      method: 'POST',
      headers: {
        cookie: 'vid=myNewToken;vs-access=myNewAccessToken;vs-refresh=myNewRefreshToken',
      },
    }).reply(200, { data: 'datadata' });

    const response = await verisure.client({ operation: 'something' });

    const expectedCookies = [
      'vid=myNewToken',
      'vs-access=myNewAccessToken',
      'vs-refresh=myNewRefreshToken',
    ];

    expect(verisure.cookies).toEqual(expectedCookies);
    expect(response).toEqual('datadata');
  });

  it('should throw if unable to refresh cookies', async () => {
    pool.intercept({ path: '/graphql', method: 'POST' }).reply(401); // Expired cookies?
    pool.intercept({ path: '/auth/token', method: 'GET' }).reply(401); // Failed to refresh.

    await expect(verisure.client({})).rejects.toThrow('Request failed with status code 401');
  });

  it('should throw if response contains errors', async () => {
    pool.intercept({ path: '/graphql', method: 'POST' }).reply(200, {
      errors: [{
        message: 'Syntax Error: Expected Name, found ")".',
        data: {
          status: 123,
        },
      }],
    });

    await expect(verisure.client({})).rejects.toThrow('GraphQL response contains 1 errors');
  });

  it('should flag known rate-limit responses', async () => {
    pool.intercept({ path: '/graphql', method: 'POST' }).reply(200, {
      errors: [{
        message: 'AUT_00021 Too many requests',
        data: { status: 429 },
      }],
    });

    await expect(verisure.client({})).rejects.toMatchObject({
      name: 'GraphqlException',
      isRateLimited: true,
    });
  });

  it('should get installations', async () => {
    pool.intercept({ path: '/graphql', method: 'POST' })
      .reply(200, readFixture('fetch-all-installations.json'));

    const installations = await verisure.getInstallations();

    expect.assertions(5);
    expect(installations.length).toBe(1);

    const [installation] = installations;
    expect(installation.giid).toBe('123456789');
    expect(installation.locale).toBe('sv_SE');
    expect(installation.config.locale).toBe('sv_SE');

    pool.intercept({
      path: '/graphql',
      method: 'POST',
      body: (body) => JSON.parse(body).variables.giid === '123456789',
    }).reply(200, readFixture('broadband.json'));

    const broadband = await installation.client({});

    expect(typeof broadband).toBe('object');
  });

  it('should retry once with different host', async () => {
    expect.assertions(4);
    verisure.host = 'automation01.verisure.com';

    pool.intercept({ path: '/graphql', method: 'POST' }).reply(200, {
      errors: [{
        message: 'Request Failed',
        data: {
          status: 503,
          errorGroup: 'SERVICE_UNAVAILABLE',
          errorCode: 'SYS_00004',
          errorMessage: 'XBN Database is not activated',
        },
      }],
    });
    pool.intercept({ path: '/graphql', method: 'POST' }).reply(200, { data: 'Success' });

    const firstResponse = await verisure.client({});
    expect(firstResponse).toBe('Success');
    expect(verisure.host).toEqual('automation02.verisure.com');

    pool.intercept({ path: '/graphql', method: 'POST' }).reply(500, 'Still not this one');
    pool.intercept({ path: '/graphql', method: 'POST' }).reply(200, { data: 'Success again' });

    const secondResponse = await verisure.client({});
    expect(secondResponse).toBe('Success again');
    expect(verisure.host).toEqual('automation01.verisure.com');
  });

  it('should reject on errors like timeouts etc', async () => {
    pool.intercept({ path: '/graphql', method: 'POST' }).replyWithError(new Error('Oh no'));
    await expect(verisure.client({})).rejects.toThrow('Oh no');
  });

  it('should reject on response code higher than 299', async () => {
    pool.intercept({ path: '/graphql', method: 'POST' }).reply(300, 'Doh');
    await expect(verisure.client({})).rejects.toThrow('Request failed with status code 300');
  });

  it('should make one request when invoked in parallel', async () => {
    pool.intercept({ path: '/graphql', method: 'POST' }).reply(200, 'Only once');
    await Promise.all([
      verisure.client({}),
      verisure.client({}),
    ]);
  });
});
