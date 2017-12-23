# Knorm

The `Knorm` class initialises an ORM. Usage:

```js
const { Knorm } = require('knorm');

const { Model, Query, Field } = new Knorm(options);

class User extends Model {}
```

## Options

These options are supported:

| Option          | Type | Description                                         |
| --------------- | ---- | --------------------------------------------------- |
| `knex`          | function (__required__) | a [knex](http://knexjs.org) instance |
| `fieldToColumn` | function | a function used to map field names to column names e.g. [snakeCase](https://lodash.com/docs/4.17.4#snakeCase) |
