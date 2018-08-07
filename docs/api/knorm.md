# Knorm

The `Knorm` class is used to initialise and configure ORMs.

## Knorm([options])

Creates a new Knorm instance:

```js
const { Knorm } = require('@knorm/knorm');
const { Model, Query, Field } = new Knorm(options);

class User extends Model {}
```

A Knorm instance has the following classes:

* [Model](api/model.md#model)
* [Query](api/query.md#query)
* [Field](api/field.md#field)
* [Transaction](api/transaction.md#transaction)

### Options

These options are supported:

| Option          | Type     | Default | Description                                                                                                   |
| --------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `debug`         | boolean  | `false` | if `true`, enables [debug mode](#debug-mode)                                                                  |
| `fieldToColumn` | function | none    | a function used to map field names to column names e.g. [snakeCase](https://lodash.com/docs/4.17.4#snakeCase) |

### Debug mode

Debug mode turns on features that help with debugging but at a cost to
performance or security in some cases. Features enabled:

* more accurate stack traces for database (fetch, insert, update and delete)
  errors. this is meant to workaround
  [this async/await issue](https://github.com/nodejs/node/issues/11865)
* if queries fail, adding the string version of the SQL that caused the error to
  the error itself, with values included. note that including values helps with
  debugging in development but would leak user data if used in production.

!> Debug mode should not be used in production!

## Knorm.prototype.models

## Knorm.prototype.addModel

## Knorm.prototype.use
