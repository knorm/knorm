# @knorm/knorm

[![npm version](https://badge.fury.io/js/@knorm/knorm.svg)](http://badge.fury.io/js/@knorm/knorm)
[![build status](https://travis-ci.org/knorm/knorm.svg?branch=master)](https://travis-ci.org/knorm/knorm)
[![coverage status](https://coveralls.io/repos/github/knorm/knorm/badge.svg?branch=master)](https://coveralls.io/github/knorm/knorm?branch=master)
[![dependency status](https://david-dm.org/knorm/knorm.svg)](https://david-dm.org/knorm/knorm)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/knorm.svg)](https://greenkeeper.io/)

A purely ES6 class-based ORM for Node.js.

## Supported environments

These environments are currently supported:

| Environment | Value           | Description                                                          |
| ----------- | --------------- | -------------------------------------------------------------------- |
| Node.js     | Version >= 7.6. | Knorm uses `async/await`                                             |
| Databases   | PostgreSQL      | via [@knorm/postgres](https://www.npmjs.com/package/@knorm/postgres) |

## Features

* [Validation](https://joelmukuthu.github.io/knorm/#/guides/validation)
* [JSON fields validation](https://joelmukuthu.github.io/knorm/#/guides/validation?id=json-validation) (similar to [Mongoose JS](http://mongoosejs.com/))
* [Plugin support](https://joelmukuthu.github.io/knorm/#/guides/plugins)
* [Field to column-name](https://joelmukuthu.github.io/knorm/#/api/knorm?id=options) transformations (e.g. snake-casing)
* [Relations](https://joelmukuthu.github.io/knorm/#/guides/relations) through SQL joins
* [Virtual fields](https://joelmukuthu.github.io/knorm/#/guides/virtuals) with support for `async` getters
* [Value casting](https://joelmukuthu.github.io/knorm/#/guides/fields?id=value-casting) before insert and update operations and after fetch operations
* custom error classes for database errors
* improved syntax for transactions
* good test coverage

> NOTE: Knorm does not create or run database migrations.

## Documentation

View the [documentation site](https://knorm.github.io/knorm/)

## License

[MIT License](./LICENSE.md)

## Credits

Knorm is inspired by the [Mongoose JS](http://mongoosejs.com/) and
[Bookshelf.js](http://bookshelfjs.org/) APIs. It was previously a built as a
wrapper around [Knex.js](http://knexjs.org), hence the kn-orm name i.e. knex-orm;
but it now generates it's own queries via [SQL Bricks.js](http://csnw.github.io/sql-bricks/).
