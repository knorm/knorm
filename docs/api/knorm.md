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
* [KnormError](api/knorm-error.md#knorm-error)
* [QueryError](api/query-error.md#query-error)
* [ValidationError](api/validation-error.md#validation-error)

## Options

These options are supported:

| Option          | Type     | Description                                                                                                   |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `fieldToColumn` | function | a function used to map field names to column names e.g. [snakeCase](https://lodash.com/docs/4.17.4#snakeCase) |
