# @knorm/soft-delete

[![npm version](https://badge.fury.io/js/knorm/soft-delete.svg)](http://badge.fury.io/js/knorm/soft-delete)
[![build status](https://travis-ci.org/knorm/soft-delete.svg?branch=master)](https://travis-ci.org/knorm/soft-delete)
[![coverage status](https://coveralls.io/repos/github/knorm/soft-delete/badge.svg?branch=master)](https://coveralls.io/github/knorm/soft-delete?branch=master)
[![dependency status](https://david-dm.org/knorm/soft-delete.svg)](https://david-dm.org/knorm/soft-delete)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/soft-delete.svg)](https://greenkeeper.io/)

Soft-delete plugin for [knorm](https://www.npmjs.com/package/knorm).

## Installation

```bash
npm install --save @knorm/knorm @knorm/soft-delete
```

> @knorm/soft-delete has a peer dependency on [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)

## Usage

```js
const knorm = require('@knorm/knorm');
const knormSoftDelete = require('@knorm/soft-delete');

const orm = knorm({
  // knorm options
}).use(knormSoftDelete({
  // knormSoftDelete options
}));
```

## Options

### name

The name of the plugin, defaults to `'soft-delete'`.

### deleted

The `deleted` field is always added, but the field and column names can be
configured. By default, the field has this config:

- field-name: `deleted`
- column-name: `deleted`

If passed as an object, supports these config options:

- `name` *string, default: deleted*: the field name to use instead of `deleted`
- `column` *string, default: deleted*: the column name to use instead of
  `deleted`

### deletedAt

Can either be `true` or an object for further configuration. If `true`, it adds
a field to the `Model` class with this config:

- field-name: `deletedAt`
- column-name: `deleted_at`

If passed as an object, supports these config options:

- `name` *string, default: deletedAt*: the field name to use instead of
  `deletedAt`
- `column` *string, default: deleted_at*: the column name to use instead of
  `deleted_at`

## How it works

This plugin adds `deleted` (by default) and `deletedAt` (if configured) fields
to your models and also updates your query methods so that the `delete` method
does not actually delete a row but rather sets the `deleted` column to `true`
and `deletedAt` to the current time (i.e. `new Date()`) if the field is enabled.
For `Query.prototype.insert`, `deleted` will be set to `false`.

It also modifies the behaviour of `Query.prototype.fetch`,
`Query.prototype.update` and `Query.prototype.delete` so that they always filter
out soft-deleted rows. To work with soft-deleted rows, use
`Query.prototype.withDeleted`, `Query.prototype.onlyDeleted` or directly use the
`Query.prototype.where` (or `whereNot`, `orWhere`, `orWhereNot`) method:

```js
// to update only soft-deleted rows:
await Model.query.onlyDeleted().update({ foo: 'bar' });
// or:
await Model.query.where({ deleted: true }).update({ foo: 'bar' });

// to fetch rows including soft-deleted rows:
await Model.query.withDeleted().where({ foo: 'bar' }).fetch();
// or:
await Model.query.where({ foo: 'bar', deleted: [ true, false ] }).fetch();
```
> **NOTE:** `withDeleted` performs better than
`where({ deleted: [true, false] })`

> `where({ deleted: [true, false] })` translates to
`WHERE deleted IN (true, false)`

> The field name used in the `where` method depends on your
[configuration](#deleted) (but defaults to `deleted`)

This plugin also adds `Query.prototype.restore`, `Model.prototype.restore` and
`Model.restore` methods that can be used to restore soft-deleted records.
Conversely, it also adds `Query.prototype.hardDelete`,
`Model.prototype.hardDelete` and `Model.hardDelete` that can be used to
hard-delete records:

```js
// to delete:
await new Model({ id: 1 }).delete();
// to restore:
await new Model({ id: 1 }).restore();
// or:
await Model.restore({ where: { id: 1 } });

// or to hard-delete:
await new Model({ id: 1 }).hardDelete();
// or:
await Model.hardDelete({ where: { id: 1 } });
```
