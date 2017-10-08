# knorm

[![npm version](https://badge.fury.io/js/knorm.svg)](http://badge.fury.io/js/knorm)
[![build status](https://travis-ci.org/joelmukuthu/knorm.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm.svg)](https://david-dm.org/joelmukuthu/knorm)
[![Greenkeeper badge](https://badges.greenkeeper.io/joelmukuthu/knorm.svg)](https://greenkeeper.io/)

A purely ES6 class-based ORM for [Knex.js](http://knexjs.org).

> NOTE: currently supports
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

> NOTE: knorm does not create or run knex migrations

## Documentation

View the [documentation site](https://joelmukuthu.github.io/knorm/)

## License

[MIT License](./LICENSE.md)

## Credits

Knorm is inspired in part by the [Mongoose JS](http://mongoosejs.com/) and
[Bookshelf.js](http://bookshelfjs.org/) APIs.
