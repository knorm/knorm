---
title: Debugging
---

Debug mode turns on features that help with debugging but at a cost to
performance or even security in some cases.

:::warning
Debug mode is not meant to be used in production. Read on for reasons why.
:::

It can be enabled globally via the `debug` option to the `Knorm` class or for a
single `Query` instance via the `debug` query option.

```js
// To enalbe globally:
const knorm = require('@knorm/knorm')
const { Model } = knorm({
  debug: true
});
// For a single Query instance:
Model.fetch({
  debug: true
});
```

When turned on, debug mode enables these features:

## Better stack traces

To work around [this Node.js async/await
issue](https://github.com/nodejs/node/issues/11865), Knorm updates the `stack`
property of `QueryError` instances to include the first line
of the method's invocation.

This is done only for database operations (insert, update, delete, fetch and
count) and involves creating an `Error` instance at the start of each of these
operations to capture the stack trace and then updating the query error  later
on, if one occurs. Having to create this placeholder `Error` instance has a
negative impact on the performance of the database operation.

| Operation                | Error updated       |
| ------------------------ | ------------------- |
| `Query.prototype.insert` | `Query.InsertError` |
| `Query.prototype.update` | `Query.UpdateError` |
| `Query.prototype.delete` | `Query.DeleteError` |
| `Query.prototype.fetch`  | `Query.FetchError`  |
| `Query.prototype.count`  | `Query.CountError`  |

## SQL values in database errors

When queries fail, Knorm attaches an `sql` property to the error with the
**parameterized** SQL that caused the failure. With debugging enabled, it
instead attaches the **stringified** version of the `sql` which contains values
instead of placeholders for the values.

For example:

```js
Model
  .insert({ username: 'foo', password: 'bar' })
  .catch(e => {
    console.log(e.sql);
    // normally, e.sql would be something like:
    // `INSERT INTO "user" ("username", "password") VALUES ($1, $2)`
    // with debug mode enabled, it would be something like:
    // `INSERT INTO "user" ("username", "password") VALUES ('foo', 'bar')`
  });
```

This presents a security risk: leaking user data. In production, where there's
likely an error-logging mechanism enabled, this error would probably be picked
up the logging mechanism and persisted somewhere. Whether it ends up on a log
file or is sent to some log-collection service, the user's information would
be made available in an environment that probably doesn't have the same security
policies as the database storing user data.
