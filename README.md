# @knorm/knorm

[![npm version](https://badge.fury.io/js/%40knorm%2Fknorm.svg)](https://badge.fury.io/js/%40knorm%2Fknorm)
[![build status](https://travis-ci.org/knorm/knorm.svg?branch=master)](https://travis-ci.org/knorm/knorm)
[![coverage status](https://coveralls.io/repos/github/knorm/knorm/badge.svg?branch=master)](https://coveralls.io/github/knorm/knorm?branch=master)
[![dependency status](https://david-dm.org/knorm/knorm.svg)](https://david-dm.org/knorm/knorm)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/knorm.svg)](https://greenkeeper.io/)

> A purely ES6 class-based ORM for Node.js.

Knorm is a collection of classes that allow creating JavaScript
[ORMs](https://en.wikipedia.org/wiki/Object-relational_mapping) to make it easier
to work with relational databases.

Knorm can be used on any existing database without requiring any changes to the
database layer. Also, knorm does not create or run any database migrations
(creating or altering tables, columns, indexes etc).

You may also use it to create ORMs on the browser (e.g. for data validation).

## Features

* [validation](https://knorm.github.io/knorm/#/guides/validation), including
  [validation for JSON fields](https://knorm.github.io/knorm/#/guides/validation?id=json-validation) (similar to [Mongoose JS](http://mongoosejs.com/))
* [plugin support](https://knorm.github.io/knorm/#/guides/plugins)
* [transactions](https://knorm.github.io/knorm/#/guides/transactions)
* [relations](https://knorm.github.io/knorm/#/knorm-relations) through SQL joins
* [field-name to column-name](https://knorm.github.io/knorm/#/api/knorm?id=knormoptions) mapping (e.g. snake-casing)
* [virtual fields](https://knorm.github.io/knorm/#/guides/virtuals) with support for `async` getters
* [value casting](https://knorm.github.io/knorm/#/guides/fields?id=value-casting) before save and after fetch
* custom error classes for database errors
* extensive test coverage

## Supported environments

These environments are currently supported:

| Environment | Value           | Description                                                                 |
| ----------- | --------------- | --------------------------------------------------------------------------- |
| Node.js     | Version >= 7.6. | Knorm uses `async/await`                                                    |
| Databases   | PostgreSQL      | via [@knorm/postgres](https://www.npmjs.com/package/@knorm/postgres) plugin |

## [Get started](https://knorm.github.io/knorm/#/guides/getting-started?id=getting-started)
