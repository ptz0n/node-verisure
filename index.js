const request = require('request')
const parseXml = require('xml2js').parseString

const API_HOST = 'e-api02.verisure.com'


const apiClient = request.defaults({
  baseUrl: `https://${API_HOST}/xbn/2/`,
  headers: {
    'Host': API_HOST
  }
})

const buildCredientials = function(email, password) {
  return Buffer.from(`CPE/${email}:${password}`, 'ascii').toString('base64')
}


module.exports = {
  auth: function(email, password, callback) {
    apiClient({
      uri: '/cookie',
      headers: {
        'Content-Type': 'application/xml;charset=UTF-8',
        'Authorization': `Basic ${buildCredientials(email, password)}`
      }
    }, function(err, res, body) {
      if(err) return callback(err)
      parseXml(body, function(err, result) {
        callback(err, result.response.string[0])
      })
    })
  },

  installations: function(token, email, callback) {
    apiClient({
      uri: `/installation/search?email=${email}`,
      headers: {
        'Cookie': `vid=${token}`
      }
    }, function(err, res, body) {
      if(err) return callback(err)
      parseXml(body, function(err, result) {
        callback(err, result.response.installation)
      })
    })
  },

  overview: function(token, installation, callback) {
    giid = typeof installation == 'string' ? installation : installation.giid[0]
    apiClient({
      uri: `/installation/${giid}/overview`,
      headers: {
        'Cookie': `vid=${token}`,
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      },
      json: true
    }, function(err, res, body) {
      callback(err, body)
    })
  }
}
