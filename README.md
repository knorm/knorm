# @knorm/to-json

[![npm version](https://badge.fury.io/js/%40knorm%2Fto-json.svg)](https://badge.fury.io/js/%40knorm%2Fto-json)
[![build status](https://travis-ci.org/knorm/to-json.svg?branch=master)](https://travis-ci.org/knorm/to-json)
[![coverage status](https://coveralls.io/repos/github/knorm/to-json/badge.svg?branch=master)](https://coveralls.io/github/knorm/to-json?branch=master)
[![dependency status](https://david-dm.org/knorm/to-json.svg)](https://david-dm.org/knorm/to-json)

[toJSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior)
plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm).

This plugin adds a `toJSON` method to knorm's `Model` class and allows configuring
what fields should be excluded from the output.

## Installation

```bash
npm install --save @knorm/knorm @knorm/to-json
```

> @knorm/to-json has a peer dependency on [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)

## Usage

```js
const knorm = require('@knorm/knorm');
const knormToJSON = require('@knorm/to-json');

const orm = knorm({
  // knorm options
}).use(
  knormToJSON({
    // @knorm/to-json options
  })
);
```

## Options

### name

The name of the plugin, defaults to `'toJSON'`.

### exclude

> type: array|string, default: []

A string or array of strings of properties to exclude from `toJSON` output.

## Configuring exclusion fields per model

You can configure fields to exclude via Model options:

```js
const { Model } = knorm().use(
  knormToJSON({
    exlude: 'id' // exclude `id` by default for all models
  })
);

Model.fields = { id: 'integer' };

class User extends Model {}

User.fields = { username: 'string', password: 'string' };
User.options = {
  plugins: {
    toJSON: { exclude: 'password' } // also exclude `password` for the `User` model
  }
};
```
