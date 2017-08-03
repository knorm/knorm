# knorm-timestamps

[![npm version](https://badge.fury.io/js/knorm-timestamps.svg)](http://badge.fury.io/js/knorm-timestamps)
[![build status](https://travis-ci.org/joelmukuthu/knorm-timestamps.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm-timestamps)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm-timestamps/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm-timestamps?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm-timestamps.svg)](https://david-dm.org/joelmukuthu/kknorm-timestamps)
[![Greenkeeper badge](https://badges.greenkeeper.io/joelmukuthu/knorm-timestamps.svg)](https://greenkeeper.io/)

Timestamps plugin for [knorm](https://www.npmjs.com/package/knorm).
knorm-timestamps exports a mixin that adds support for
[knex timestamps](http://knexjs.org/#Schema-timestamps).

## Installation
```bash
npm install --save knorm knorm-timestamps
```
> knorm-timestamps has a peer dependency on [knorm](https://www.npmjs.com/package/knorm)

## Usage
### 1. Enhance knorm's Query class

```js
const { Query: KnormQuery } = require('knorm');
const { withTimestamps } = require('knorm-timestamps');

class Query extends withTimestamps(KnormQuery) {}
```

### 2. Enhance knorm's Model class

Then configure your ORM with the knex instance:

```js
const { Model: KnormModel } = require('knorm');

const config = { createdAt: true, updatedAt: true };
class Model extends withTimestamps(KnormModel, config) {}
Model.Query = Query; // configure Model with the enhanced Query class
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
- `default` *mixed, default: undefined*: the default value to use for the field.
  this can also be a function, e.g. `() => new Date()`
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
- `default` *mixed, default: undefined*: the default value to use for the field.
  this can also be a function, e.g. `() => new Date()`
- `column` *string, default: updated_at*: the column name to use instead of
  `updated_at`
