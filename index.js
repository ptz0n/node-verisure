const request = require('request')
const striptags = require('striptags')

const API_HOSTS = [
  'e-api01.verisure.com',
  'e-api02.verisure.com'
]

let apiHost = API_HOSTS[0]

const apiClient = function(options, callback, retrying) {
  if(retrying) {
    apiHost = API_HOSTS[0] == apiHost ? API_HOSTS[1] : API_HOSTS[0]
  }

  options.baseUrl = `https://${apiHost}/xbn/2/`
  options.headers = options.headers || {}
  options.headers['Host'] = apiHost

  return request(options, function(err, res, body) {
    if(err && callback) return callback(err)
    if(res.statusCode > 499 && !retrying) {
      return apiClient(options, callback, true)
    }
    callback && callback(err, res, body)
  })
}

const buildCredientials = function(email, password) {
  return Buffer.from(`CPE/${email}:${password}`, 'ascii').toString('base64')
}


module.exports = {
  _apiClient: apiClient,
  _buildCredientials: buildCredientials,

  auth: function(email, password, callback) {
    apiClient({
      uri: '/cookie',
      headers: {
        'Content-Type': 'application/xml;charset=UTF-8',
        'Authorization': `Basic ${buildCredientials(email, password)}`
      }
    }, function(err, res, body) {
      if(err) return callback(err)
      if(res.statusCode !== 200) return callback(res.body)
      callback(null, striptags(body).trim())
    })
  },

  installations: function(token, email, callback) {
    apiClient({
      uri: `/installation/search?email=${email}`,
      headers: {
        'Cookie': `vid=${token}`,
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      },
      json: true
    }, function(err, res, body) {
      if(res.statusCode !== 200) return callback(res.body)
      callback(err, body)
    })
  },

  overview: function(token, installation, callback) {
    giid = typeof installation == 'string' ? installation : installation.giid
    apiClient({
      uri: `/installation/${giid}/overview`,
      headers: {
        'Cookie': `vid=${token}`,
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      },
      json: true
    }, function(err, res, body) {
      if(res.statusCode !== 200) return callback(res.body)
      callback(err, body)
    })
  }
}
