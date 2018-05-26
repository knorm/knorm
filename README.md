# @knorm/timestamps

[![npm version](https://badge.fury.io/js/@knorm/timestamps.svg)](http://badge.fury.io/js/@knorm/timestamps)
[![build status](https://travis-ci.org/knorm/timestamps.svg?branch=master)](https://travis-ci.org/knorm/timestamps)
[![coverage status](https://coveralls.io/repos/github/knorm/timestamps/badge.svg?branch=master)](https://coveralls.io/github/knorm/timestamps?branch=master)
[![dependency status](https://david-dm.org/knorm/timestamps.svg)](https://david-dm.org/knorm/timestamps)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/timestamps.svg)](https://greenkeeper.io/)

Timestamps plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm).

This plugin adds the [knex timestamp](http://knexjs.org/#Schema-timestamps)
fields to your models and also updates your query methods so that `createdAt`
and `updatedAt` are set to the current time (i.e. `new Date()`) for `insert`
calls and the `updatedAt` field is set to the current time for any `update`
calls. It will also ensure that any `update` calls do not overwrite the
`createdAt` field.

## Installation

```bash
npm install --save @knorm/knorm @knorm/timestamps
```

> @knorm/timestamps has a peer dependency on [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)

## Usage

```js
const knorm = require('@knorm/knorm');
const knormTimestamps = require('@knorm/timestamps');

const orm = knorm({
  // knorm options
}).use(
  knormTimestamps({
    // knormTimestamps options
  })
);
```

## Options

### name

The name of the plugin, defaults to `'timestamps'`.

### createdAt

> type: object, default: `{ name: 'createdAt', column: 'created_at' }`

The `createdAt` field can be configured with these options:

* `name` _string, default: createdAt_: the field name
* `column` _string, default: created_at_: the column name

### updatedAt

> type: object, default: `{ name: 'updatedAt', column: 'updated_at' }`

The `updatedAt` field can be configured with these options:

* `name` _string, default: updatedAt_: the field name
* `column` _string, default: updated_at_: the column name
