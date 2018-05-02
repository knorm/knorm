# @knorm/relations

[![npm version](https://badge.fury.io/js/@knorm/relations.svg)](http://badge.fury.io/js/@knorm/relations)
[![build status](https://travis-ci.org/knorm/paginate.svg?branch=master)](https://travis-ci.org/knorm/paginate)
[![coverage status](https://coveralls.io/repos/github/knorm/paginate/badge.svg?branch=master)](https://coveralls.io/github/knorm/paginate?branch=master)
[![dependency status](https://david-dm.org/knorm/paginate.svg)](https://david-dm.org/joelmukuthu/@knorm/relations)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/paginate.svg)](https://greenkeeper.io/)

Relations plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm).

## Installation
```bash
npm install --save @knorm/knorm @knorm/relations
```
> @knorm/relations has a peer dependency on [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)

## Usage

```js
const knorm = require('@knorm/knorm');
const knormPaginate = require('@knorm/relations');

const orm = knorm({
  // knorm options
}).use(knormPaginate({
  // knormPaginate options
}));
```

## Options

## API

### Query.prototype.join / Query.prototype.innerJoin / Query.prototype.leftJoin

