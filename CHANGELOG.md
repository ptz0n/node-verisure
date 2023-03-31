## 5.1.1 (Mar 31, 2023)

* Switch hostname on error in GraphQL response with status > 499

## 5.1.0 (Mar 19, 2023)

* Throw on errors in GraphQL response.

## 5.0.0 (Mar 18, 2023)

* __Breaking:__ Auth using all cookies.
* __Breaking:__ GraphQL interface.

## 4.1.0 (Oct 8, 2021)

* Update hostname and method for authentication.

## 4.0.0 (Mar 16, 2021)

* __Breaking:__ Support for MFA.

## 3.1.1 (Feb 28, 2021)

* Handle auth with missing cookie.

## 3.1.0 (Feb 24, 2021)

* Support new auth hosts.

## 3.0.0 (Oct 5, 2019)

* __Breaking:__ Replace `request` with `axios` as underlying http client.
* __Breaking:__ Drop support for Node <8.

## 2.4.0 (May 29, 2018)

* Default client requests to JSON.

## 2.3.0 (Apr 29, 2018)

* Expose all installation data as config properties.

## 2.2.0 (Apr 17, 2018)

* Expose installation `locale` as instance property.

## 2.1.1 (Apr 16, 2018)

* Fix syntax error in Node 7.

## 2.1.0 (Apr 5, 2018)

* Reuse promises when doing the same call in parallel.

## 2.0.0 (Apr 2, 2018)

* __Breaking:__ Promises in favor of callbacks.
* Refactor to class definitions.

## 1.2.0 (Apr 23, 2017)

* Support for Node 4 & 5.
* Retry failed request to different Verisure host.

## 1.1.0 (Dec 11, 2016)

* Basic support for auth, installations and overview.
