# @knorm/relations

[![npm version](https://badge.fury.io/js/@knorm/relations.svg)](http://badge.fury.io/js/@knorm/relations)
[![build status](https://travis-ci.org/knorm/relations.svg?branch=master)](https://travis-ci.org/knorm/relations)
[![coverage status](https://coveralls.io/repos/github/knorm/relations/badge.svg?branch=master)](https://coveralls.io/github/knorm/relations?branch=master)
[![dependency status](https://david-dm.org/knorm/relations.svg)](https://david-dm.org/joelmukuthu/@knorm/relations)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/relations.svg)](https://greenkeeper.io/)

Relations plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm).

## Installation
```bash
npm install --save @knorm/knorm @knorm/relations
```
> @knorm/relations has a peer dependency on [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)

## Usage

```js
const knorm = require('@knorm/knorm');
const knormRelations = require('@knorm/relations');

const orm = knorm({
  // knorm options
}).use(knormRelations({
  // knormRelations options
}));
```

## Options

## API

### Query.prototype.join / Query.prototype.innerJoin / Query.prototype.join

