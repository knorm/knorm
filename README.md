# knorm-postgres

[![npm version](https://badge.fury.io/js/knorm-postgres.svg)](http://badge.fury.io/js/knorm-postgres)
[![build status](https://travis-ci.org/joelmukuthu/knorm-postgres.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm-postgres)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm-postgres/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm-postgres?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm-postgres.svg)](https://david-dm.org/joelmukuthu/kknorm-postgres)
[![Greenkeeper badge](https://badges.greenkeeper.io/joelmukuthu/knorm-postgres.svg)](https://greenkeeper.io/)

Postgres plugin for [knorm](https://www.npmjs.com/package/knorm). Adds 
postgres-specific features such as:

* [automatically JSON-stringify](http://knexjs.org/#Schema-json) all `json` and 
  `jsonb` fields before save
* automatically validate all `string` fields with `maxLength: 255`

## Installation
```bash
npm install --save knorm knorm-postgres
```
> knorm-postgres has a peer dependency on
[knorm](https://www.npmjs.com/package/knorm)

## Usage

```js
const knorm = require('knorm');
const knormPostgres = require('knorm-postgres');

const orm = knorm({
  // knorm options
}).use(knormPostgres({
  // knormPostgres options
}));
```

