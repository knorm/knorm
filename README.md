# knorm-timestamps

[![npm version](https://badge.fury.io/js/knorm-timestamps.svg)](http://badge.fury.io/js/knorm-timestamps)
[![build status](https://travis-ci.org/joelmukuthu/knorm-timestamps.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm-timestamps)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm-timestamps/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm-timestamps?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm-timestamps.svg)](https://david-dm.org/joelmukuthu/kknorm-timestamps)
[![Greenkeeper badge](https://badges.greenkeeper.io/joelmukuthu/knorm-timestamps.svg)](https://greenkeeper.io/)

Timestamps plugin for [knorm](https://www.npmjs.com/package/knorm).

This plugin adds the [knex timestamp](http://knexjs.org/#Schema-timestamps)
fields to your models and also updates your query methods so that `createdAt`
and `updatedAt` are set to the current time (i.e. `new Date()`) for `insert`
calls and the `updatedAt` field is set to the current time for any `update`
calls. It will also ensure that any `update` calls do not overwrite the
`createdAt` field.

## Installation
```bash
npm install --save knorm knorm-timestamps
```
> knorm-timestamps has a peer dependency on
[knorm](https://www.npmjs.com/package/knorm)

## Usage

```js
const knorm = require('knorm');
const knormTimestamps = require('knorm-timestamps');

const orm = knorm({
  // knorm options
}).use(knormTimestamps({
  // knormTimestamps options
}));
```

## Options

### createdAt

Can either be `true` or an object for further configuration. If `true`, it adds
a field to the `Model` class with this config:
- field-name: `createdAt`
- column-name: `created_at`

If passed as an object, supports these config options:
- `name` *string, default: createdAt*: the field name to use instead of
  `createdAt`
- `column` *string, default: created_at*: the column name to use instead of
  `created_at`

### updatedAt

Can either be `true` or an object for further configuration. If `true`, it adds
a field to the `Model` class with this config:
- field-name: `updatedAt`
- column-name: `updated_at`

If passed as an object, supports these config options:
- `name` *string, default: updatedAt*: the field name to use instead of
  `updatedAt`
- `column` *string, default: updated_at*: the column name to use instead of
  `updated_at`
