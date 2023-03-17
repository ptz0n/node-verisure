# node-verisure

[![](https://badges.greenkeeper.io/ptz0n/node-verisure.svg)](https://greenkeeper.io/)

[![GitHub Actions badge](https://github.com/ptz0n/node-verisure/workflows/Test/badge.svg)](https://github.com/ptz0n/node-verisure/actions?query=workflow%3ATest)

A module for reading and changing status of Verisure devices.

### Legal Disclaimer

This software is not affiliated with Verisure Holding AB and the developers take no legal responsibility for the functionality or security of your alarms and devices.

### Installation

```bash
$ npm install verisure --save
```

### Usage

```javascript
const Verisure = require('verisure');

const verisure = new Verisure('my@email.com', 'mysecretpassword');

verisure.getToken()
  .then(() => verisure.getInstallations())
  .then(installations => installations[0].getOverview())
  .then((overview) => {
    console.log('OVERVIEW:', overview);
  })
  .catch((error) => {
    console.error(error);
  });
```

### Multi-factor authentication

For users with MFA enabled, you need to invoke `getToken` twice. First without arguments, second with the one-time code.

```javascript
const verisure = new Verisure(email, password);

await verisure.getToken();

console.log('One-time code sent.');

await verisure.getToken(code);

console.log(verisure.cookies);
```

Once you retrieve the cookies, these can be used to make authenticated requests.

```javascript
const verisure = new Verisure('my@email.com', null, [
  'vid=myTopSecretToken',
  'vs-access=myAccessToken',
  'vs-refresh=myRefreshToken'
]);

const installations = await verisure.getInstallations();
```
