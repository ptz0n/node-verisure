const assert = require('assert')

const nock = require('nock')

const verisure = require('../index')


nock.disableNetConnect()
scope = nock('https://e-api02.verisure.com')


describe('Utils', function() {
  it('should expose api client with defaults', function(done) {
    scope.get('/xbn/2/').reply(200)
    verisure._apiClient({uri: '/'}, function(err, res, body) {
      assert.deepEqual(res.req.headers, { host: 'e-api02.verisure.com' })
      done()
    })
  })

  it('should build credientials', function() {
    credientials = verisure._buildCredientials('email', 'password')
    assert.equal(credientials, 'Q1BFL2VtYWlsOnBhc3N3b3Jk')
  })
})

describe('Methods', function() {
  it('should request auth token', function(done) {
    scope.get('/xbn/2/cookie')
      .replyWithFile(200, `${__dirname}/responses/cookie.xml`)
    verisure.auth('email', 'password', function(err, token) {
      assert.equal(token, 'myExampleToken')
      done()
    })
  })

  it('should request installations', function(done) {
    const email = 'my@email.com'
    scope.get(`/xbn/2/installation/search?email=${email}`)
      .replyWithFile(200, `${__dirname}/responses/installations.json`)
    verisure.installations('myExampleToken', email, function(err, installations) {
      assert.equal(installations[0].giid, '123456789')
      done()
    })
  })

  it('should request overview by installation as string', function(done) {
    const installation = 'myGiid'
    scope.get(`/xbn/2/installation/${installation}/overview`)
      .replyWithFile(200, `${__dirname}/responses/overview.json`)
    verisure.overview('myExampleToken', installation, function(err, overview) {
      assert.equal(typeof overview, 'object')
      assert.equal(overview.armstateCompatible, true)
      done()
    })
  })

  it('should request overview by installation as object', function(done) {
    const installation = {
      giid: 'myGiid'
    }
    scope.get(`/xbn/2/installation/${installation.giid}/overview`)
      .replyWithFile(200, `${__dirname}/responses/overview.json`)
    verisure.overview('myExampleToken', installation, function(err, overview) {
      assert.equal(typeof overview, 'object')
      assert.equal(overview.armstateCompatible, true)
      done()
    })
  })
})
