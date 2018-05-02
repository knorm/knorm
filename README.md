# knorm

[![npm version](https://badge.fury.io/js/knorm.svg)](http://badge.fury.io/js/knorm)
[![build status](https://travis-ci.org/joelmukuthu/knorm.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm.svg)](https://david-dm.org/joelmukuthu/knorm)
[![Greenkeeper badge](https://badges.greenkeeper.io/joelmukuthu/knorm.svg)](https://greenkeeper.io/)

A purely ES6 class-based ORM for [Knex.js](http://knexjs.org).

## Supported environments

These environments are currently supported:

| Environment | Value                        | Description                                                             |
| ----------- | ---------------------------- | ----------------------------------------------------------------------- |
| Node.js     | Version >= 7.6.              | knorm uses `async/await`                                                |
| Databases   | PostgreSQL, MSSQL and Oracle | knorm uses the [RETURNING clause](http://knexjs.org/#Builder-returning) |

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

> NOTE: knorm does not create or run knex migrations

## Documentation

View the [documentation site](https://joelmukuthu.github.io/knorm/)

## License

[MIT License](./LICENSE.md)

## Credits

Knorm is inspired in part by the [Mongoose JS](http://mongoosejs.com/) and
[Bookshelf.js](http://bookshelfjs.org/) APIs.
