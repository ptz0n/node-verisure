# node-verisure

[![Greenkeeper badge](https://badges.greenkeeper.io/ptz0n/node-verisure.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/ptz0n/node-verisure.svg?branch=master)](https://travis-ci.org/ptz0n/node-verisure)

A module for reading and changing status of Verisure devices.

### Legal Disclaimer

This software is not affiliated with Verisure Holding AB and the developers take no legal responsibility for the functionality or security of your alarms and devices.

### Installation

```bash
$ npm install verisure
```

### Usage

```javascript
var verisure = require('verisure')

var email = 'my@email.com',
    password = 'mysecretpassword'

verisure.auth(email, password, function(err, token) {
  console.log('TOKEN:', token)

  verisure.installations(token, email, function(err, installations) {
    console.log('INSTALLATIONS:', installations)

    verisure.overview(token, installations[0], function(err, overview) {
      console.log('OVERVIEW:', overview)
    })
  })
})
```
