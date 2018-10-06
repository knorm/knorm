# @knorm/knorm

[![npm version](https://badge.fury.io/js/%40knorm%2Fknorm.svg)](https://badge.fury.io/js/%40knorm%2Fknorm)
[![build status](https://travis-ci.org/knorm/knorm.svg?branch=master)](https://travis-ci.org/knorm/knorm)
[![coverage status](https://coveralls.io/repos/github/knorm/knorm/badge.svg?branch=master)](https://coveralls.io/github/knorm/knorm?branch=master)
[![dependency status](https://david-dm.org/knorm/knorm.svg)](https://david-dm.org/knorm/knorm)

> A JavaScript ORM written using ES6 classes.

Knorm is a collection of classes that allow creating JavaScript
[ORM's](https://en.wikipedia.org/wiki/Object-relational_mapping) to make it
easier to work with relational databases.

Knorm can be used on any existing database without requiring any changes to the
database layer. It does not (yet) create or run any database migrations
(creating or altering tables, columns, indexes etc), nor does it generate models
from existing database schema (yet). For creating and running migrations,
consider a library such as [Knex.js](http://knexjs.org).

It can also be used on the browser to create models that do not interact with
the  database, perhaps for data validation. Please note that it's not secure to
generate queries on the browser and send them for processing to a backend
server.

## Features

* simplicity - easy to extend, configure or override, owing to ES6 classes.
* [validation](https://knorm.netlify.com/guides/validation.html), including
  [validation for JSON fields](https://knorm.netlify.com/guides/validation.html#json-validation) (similar to [Mongoose JS](http://mongoosejs.com/))
* [plugin support](https://knorm.netlify.com/guides/plugins.html)
* [transactions](https://knorm.netlify.com/guides/transactions.html)
* [relations](https://knorm-relations.netlify.com) through SQL joins
* [field-name to column-name](https://knorm.netlify.com/api.html#new-knorm-config) mapping (e.g. snake-casing)
* [virtual fields](https://knorm.netlify.com/guides/virtuals.html) with support for `async` getters
* [value casting](https://knorm.netlify.com/guides/fields.html#value-casting) before save and after fetch
* custom error classes for database errors
* extensive test coverage

## Supported environments

These environments are currently supported:

| Environment | Value           | Description                                                                 |
| ----------- | --------------- | --------------------------------------------------------------------------- |
| Node.js     | Version >= 7.6. | Knorm uses `async/await`                                                    |
| Databases   | PostgreSQL      | via the [@knorm/postgres](https://www.npmjs.com/package/@knorm/postgres) plugin |

## [Get started](https://knorm.netlify.com/getting-started.html)
