# knorm

[![npm version](https://badge.fury.io/js/knorm.svg)](http://badge.fury.io/js/knorm)
[![build status](https://travis-ci.org/joelmukuthu/knorm.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm.svg)](https://david-dm.org/joelmukuthu/knorm)
[![Greenkeeper badge](https://badges.greenkeeper.io/joelmukuthu/knorm.svg)](https://greenkeeper.io/)

A purely ES6 class-based ORM for [Knex.js](http://knexjs.org).

!> NOTE: currently supports
[PostgreSQL, MSSQL and Oracle databases](http://knexjs.org/#Builder-returning)

## Features

- model validation (before insert and update operations) with custom error
  classes and support for custom validators (including async validators)
- value casting before insert and update operations and after fetch operations
- JSON schema validation (similar to [Mongoose JS](http://mongoosejs.com/))
- SQL joins with full JavaScript syntax
- virtual fields (i.e. computed fields) with support for sync and async getters
- model field-name to database column-name transformations (e.g. snake-casing)
- custom error classes for database errors
- improved syntax for transactions
- full and easy configuration and extendability (owing to ES6 classes). also
  through [plugins](/#/?id=plugins ":ignore :target=_self")
- good test coverage

!> NOTE: knorm does not create or run knex migrations

## Installation

```bash
npm install --save knorm
```

> knorm has a peer dependency on [knex](http://knexjs.org)

## Docs

- Guides
  - [Getting started](guides/getting-started.md)
  - [Relations](guides/relations.md)
  - [Validation](guides/validation.md)
- API
  - [Model](api/model.md)
  - [Field](api/field.md)
  - [Query](api/query.md)
  - [Transaction](api/transaction.md)
  - [KnormError](api/knorm-error.md)
  - [QueryError](api/query-error.md)
  - [ValidationError](api/validation-error.md)

## Plugins
- [knorm-timestamps](https://www.npmjs.com/package/knorm-timestamps)
- [knorm-soft-delete](https://www.npmjs.com/package/knorm-soft-delete)

## TODOs

- build and test ES5 classes and include them in releases
- add more documentation (in the meantime, the tests are a good source of
  documentation)
- run tests against other databases besides PostgreSQL
- add support for databases that don't support RETURNING clauses
- add a tool to generate models from DESCRIBE queries
- add a tool to generate models from knex migrations
- add a tool to generate knex migrations from models

> run `npm run todo` to see TODOs in the code

PRs are very welcome!
