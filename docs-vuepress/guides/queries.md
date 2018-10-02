# Queries

For all database operations that [Model](api/model.md#model) performs, the
[Query](api/query.md#query) class does all the heavy lifting. It transforms
JavaScript function calls into SQL and parses the data from the database into
Model instances.

## Query config

Queries are configured through these properties:

| Property              | Type     | Default                                         | Description                                                                                                                                                                                                            |
| --------------------- | -------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Query.prototype.sql` | function | [sql-bricks](https://csnw.github.io/sql-bricks) | The function used to generate SQL. This allows plugins to add more features for example with [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres), which is what [@knorm/postgres](knorm-postgres) does. |

> See the [Query](api/query.md#query) docs for Query API documentation

## Initializing queries

Assuming this ORM:

```js
const knorm = require('@knorm/knorm');
const { Model, Query } = knorm();

class User extends Model {}
User.table = 'user';
User.fields = { id: { type: 'integer', primary: true }, names: 'string' };
```

The most convenient way to run queries is through the `Model.query` getter:

```js
const query = User.query;
```

Alternatively, you can initialize a query via the
[Query constructor](api/query.md#querymodel):

```js
const query = new Query(User); // the model class is required
```

!> Query instances are not reusable! Therefore, the recommended way of creating
queries is the `Model.query` getter

## Running queries

Similar to [Model](api/model.md#model), you can save, retrieve or delete data in
the database with the same CRUD methods:

```js
// either insert or update (if the instance has a primary field-value set):
User.query.save(data, options);

// or directly call:
User.query.insert(data, options);
User.query.update(data, options);

// fetch or re-fetch:
User.query.fetch(options);

// delete:
User.query.delete(options);
```

> All the methods return a `Promise`

> `options` are optional in all methods

!> The Query CRUD methods operate on multiple rows (similar to the Model statics).
Only [update](api/query.md#queryprototypeupdatedata-options-promise-gt-model)
behaves differently when passed an object with the primary field set:

```js
User.query.update({ names: 'foo' }); // updates all rows
User.query.update({ id: 1, names: 'foo' }); // updates only row 1
```

## Running raw queries

Raw queries can be run by directly invoking the
[query](api/query.md#queryprototypequerysql-promise-gt-) method:

```js
const rows = await User.query.query('select now()');
```

To run prepared statements with parameter binding, use
[sql](api/query.md#queryprototypesql), which by default is an
[sql-bricks](https://csnw.github.io/sql-bricks/) instance:

```js
const sqlBricks = User.query.sql;
const sql = sqlBricks.select(
  sqlBricks.sql('select * from "user" where id = $1 and names = $2', [1, 'foo'])
);
const rows = await User.query.query(sql);
```

> with the @knorm/postgres loaded, then `Query.prototype.sql` is overridden with
> [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres)

## Setting options

Options can be set by calling methods:

```js
User.query
  .where({ names: 'foo' }) // names matching 'foo'
  .first() // return the first object instead of an array
  .require() // throw and error if no row is not found
  .fetch();
```

Or by passing an `options` object to a CRUD method:

```js
User.query.fetch({
  where: { names: 'foo' },
  first: true,
  require: true
});
```

Which is a proxy to [setOptions](api/query.md#queryprototypesetoptionsoptions-query):

```js
User.query
  .setOptions({
    where: { names: 'foo' },
    first: true,
    require: true
  })
  .fetch();
```

> The object notation only works for options that take one argument (majority)

For most query options, calling the same option does not overwrite the previous
value but instead appends to it. However, for boolean-value options, setting the
same option overwrites the previous value:

```js
User.query
  .where({ id: 1 })
  .fields(['id'])
  .require(false)
  .setOptions({
    where: { names: 'foo' }, // `where` is now `{ id: 1, names: 'foo' }`
    fields: ['name'], // `fields` are now `[ 'id', 'name' ]`
    require: true  // `require` is now `true`
  })
  .fetch({
    require: false  // `require` will eventually be `false`
  });
```

You can set default query options per model via the `Model.options` setter:

```js
User.options = {
  query: { fields: ['id'] }
};

User.fetch(); // instances returned will only contain the `id` field
```

## Where expressions

To create more complicated `where` queries, use where expressions:

```js
User.query
  .where(
    User.where.and(
      User.where.in('id', [1, 2, 3]),
      User.where.like({ foo: '%foo%' }),
      User.where.or(
        User.where.notEqual({ id: 4 }),
        User.where.not(User.where.between({ id: [10, 20] }))
      )
    )
  )
  .fetch();
```

These are similar to the [sql-bricks](https://csnw.github.io/sql-bricks/) where
expressions, with some added features:

* Support for objects in all where expressions e.g. `User.where.in({ id: [1, 2] })`
* Support for `between` with an array e.g. `User.where.between({ id: [10, 20] })`
* Additional full length aliases for all the sql-bricks' where expressions:

| sql-bricks' method | knorm's method | knorm's additional alias |
| ------------------ | -------------- | ------------------------ |
| and                | and            | -                        |
| or                 | or             | -                        |
| not                | not            | -                        |
| eq                 | eq             | equal                    |
| notEq              | notEq          | notEqual                 |
| lt                 | lt             | lessThan                 |
| lte                | lte            | lessThanOrEqual          |
| gt                 | gt             | greaterThan              |
| gte                | gte            | greaterThanOrEqual       |
| between            | between        | -                        |
| isNull             | isNull         | -                        |
| isNotNull          | isNotNull      | -                        |
| like               | like           | -                        |
| exists             | exists         | -                        |
| in                 | in             | -                        |
| eqAll              | eqAll          | equalAll                 |
| notEqAll           | notEqAll       | notEqualAll              |
| ltAll              | ltAll          | lessThanAll              |
| lteAll             | lteAll         | lessThanOrEqualAll       |
| gtAll              | gtAll          | greaterThanAll           |
| gteAll             | gteAll         | greaterThanOrEqualAll    |
| eqAny              | eqAny          | equalAny                 |
| notEqAny           | notEqAny       | notEqualAny              |
| ltAny              | ltAny          | lessThanAny              |
| lteAny             | lteAny         | lessThanOrEqualAny       |
| gtAny              | gtAny          | greaterThanAny           |
| gteAny             | gteAny         | greaterThanOrEqualAny    |
| eqSome             | eqSome         | equalSome                |
| notEqSome          | notEqSome      | notEqualSome             |
| ltSome             | ltSome         | lessThanSome             |
| lteSome            | lteSome        | lessThanOrEqualSome      |
| gtSome             | gtSome         | greaterThanSome          |
| gteSome            | gteSome        | greaterThanOrEqualSome   |

## Query errors

In case of any failures, the CRUD methods reject their promises with a custom
error that wraps the error thrown by the database driver:

```js
User.query.insert({ id: 1 });
User.query.insert({ id: 1 });
// => User.InsertError(new Error('duplicate primary key error, thrown by the database drver'));
```

In addition, if the `require` option is set on a query and no rows are
inserted/updated/fetched/deleted, then the promise is rejected with a `NoRowsError`:

```js
User.query
  .require()
  .where({ names: 'does not exist' })
  .fetch();
// => User.NoRowsFetchedError();
User.query
  .require()
  .where({ names: 'does not exist' })
  .update({ names: 'foo' });
// => User.NoRowsUpdatedError();
```

> See the [Query](api/query.md#query) docs for more info on all the query errors
