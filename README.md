# @knorm/postgres

[![npm version](https://badge.fury.io/js/%40knorm%2Fpostgres.svg)](https://badge.fury.io/js/%40knorm%2Fpostgres)
[![build status](https://travis-ci.org/knorm/postgres.svg?branch=master)](https://travis-ci.org/knorm/postgres)
[![coverage status](https://coveralls.io/repos/github/knorm/postgres/badge.svg?branch=master)](https://coveralls.io/github/knorm/postgres?branch=master)
[![dependency status](https://david-dm.org/knorm/postgres.svg)](https://david-dm.org/knorm/postgres)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/postgres.svg)](https://greenkeeper.io/)

Postgres plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)
that enables running queries agaisnt postgres. Also, it adds postgres-specific
features such as:

* [automatically JSON-stringifying](http://knexjs.org/#Schema-json) all `json`
  and `jsonb` fields before save (insert or update)
* automatically validating all `string` fields with `maxLength: 255`
* `limit`, `offset`, `returning` query options and `ilike` where option,
  via [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres)
* updating multiple rows using a single query with `UPDATE FROM`, via
  [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres)
* connection pooling, via [pg](https://node-postgres.com/features/pooling)
* transactions

## Installation

```bash
npm install --save @knorm/knorm @knorm/postgres
```

> @knorm/postgres has a peer dependency on [@knorm/knorm](https://www.npmjs.com/package/knorm)

## Initialization

```js
const knorm = require('@knorm/knorm');
const knormPostgres = require('@knorm/postgres');

const orm = knorm({
  // knorm options
}).use(
  knormPostgres({
    // knormPostgres options
  })
);
```

## Options

| Option          | Type             | Description                                                                                                                                                                                                                                           |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | string           | the name of the plugin, defaults to `'postgres'`                                                                                                                                                                                                      |
| `connection`    | object or string | if set, this option is passed directly to [pg](https://node-postgres.com/features/connecting#programmatic). However, connections can also be configured via [environment variables](https://www.postgresql.org/docs/current/static/libpq-envars.html) |
| `initClient`    | (async) function | a function called when a new client is acquired from the pool. useful for configuring the connection e.g. setting session variables. it's called with the client as the only argument                                                                 |
| `restoreClient` | (async) function | a function called before a client is released back into the pool. useful for restoring a client e.g. unsetting session variables. it's called with the client as the only argument                                                                    |
NOTE that all options are optional.

## Usage

### JSON patching

When updating `json` and `jsonb` fields, you may wish to only update part of the
JSON data instead of the whole object. You can partially update json fields via
the `patch` option:

* set the option value to `true` to patch all the json and jsonb fields in the
  update data
* set the option value to a string field-name to patch a single field in the
  update data
* set the option value to an array of field-names to patch a multiple fields
  in the update data

For example:

```js
class User extends Model {}

User.fields = {
  id: { type: 'integer' },
  jsonb: { type: 'jsonb' },
  json: { type: 'json' }
};

const data = { jsonb: { foo: 'bar' }, json: { foo: 'bar' } };

// to update whole object without patching:
User.update(data);

// to patch all fields in the update:
User.update(data, { patch: true });

// to patch a single field:
User.update(data, { patch: 'json' });

// to patch multiple fields:
User.update(data, { patch: ['json', 'jsonb'] });
```

Note that only basic json-patching is supported: only the first level of patching
is supported. For instance, nested objects or array values cannot be patched since
@knorm/postgres cannot figure out if the intention is patch the object/array or
to replace it entirely:

```js
// assuming the data is currently:
new User({
  jsonb: { top: { foo: 'foo' } },
  json: { top: { foo: 'foo' } }
});

// is the intention here to add a new `bar` key to the `top` object or to replace
// the `top` key with the value `{ bar: 'bar' }`?
User.query
  .patch(['json', 'jsonb'])
  .update({
    jsonb: { top: { bar: 'bar' } },
    json: { top: { bar: 'bar' } },
  });
```

For complex patching, use
[jsonb_set](https://www.postgresql.org/docs/9.5/static/functions-json.html)
directly in a raw-sql update:

```js
// to add a nested `bar` key/value:
User.query
  .patch(['json', 'jsonb'])
  .update({
    jsonb: User.query.sql(`jsonb_set("jsonb", '{top,bar}', '"bar"')`),
    // for json field-types, you have to cast to jsonb and then cast the result
    // back to json
    json: User.query.sql(`jsonb_set("json"::jsonb, '{top,bar}', '"bar"')::json`)
  });

// result:
new User({
  jsonb: { top: { foo: 'foo', bar: 'bar' } },
  json: { top: { foo: 'foo', bar: 'bar' } }
});
```
