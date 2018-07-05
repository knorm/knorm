# Knorm

The `Knorm` class initialises an ORM. Usage:

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

## Options

These options are supported:

| Option          | Type     | Default | Description                                                                                                   |
| --------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `debug`         | boolean  | `false` | if `true`, enables [debug mode](#debug-mode)                                                                  |
| `fieldToColumn` | function | none    | a function used to map field names to column names e.g. [snakeCase](https://lodash.com/docs/4.17.4#snakeCase) |

## Debug mode

Debug mode turns on features that help with debugging but at a cost to
performance. Features enabled:

* more accurate stack traces for database (fetch, insert, update and delete)
  errors. this is meant to workaround [this async/await issue](https://github.com/nodejs/node/issues/11865)

!> Debug mode should not be used in production!
