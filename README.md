# @knorm/paginate

[![npm version](https://badge.fury.io/js/%40knorm%2Fpaginate.svg)](https://badge.fury.io/js/%40knorm%2Fpaginate)
[![build status](https://travis-ci.org/knorm/paginate.svg?branch=master)](https://travis-ci.org/knorm/paginate)
[![coverage status](https://coveralls.io/repos/github/knorm/paginate/badge.svg?branch=master)](https://coveralls.io/github/knorm/paginate?branch=master)
[![dependency status](https://david-dm.org/knorm/paginate.svg)](https://david-dm.org/joelmukuthu/@knorm/paginate)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/paginate.svg)](https://greenkeeper.io/)

Pagination plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm).

## Installation
```bash
npm install --save @knorm/knorm @knorm/paginate
```
> @knorm/paginate has a peer dependency on [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)

## Usage

```js
const knorm = require('@knorm/knorm');
const knormPaginate = require('@knorm/paginate');

const orm = knorm({
  // knorm options
}).use(knormPaginate({
  // knormPaginate options
}));
```

## Options

### name

The name of the plugin, defaults to `'paginate'`.

## API

### Query.prototype.count / Model.count

