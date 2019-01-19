# @knorm/postgres

[![npm version](https://badge.fury.io/js/%40knorm%2Fpostgres.svg)](https://badge.fury.io/js/%40knorm%2Fpostgres)
[![build status](https://travis-ci.org/knorm/postgres.svg?branch=master)](https://travis-ci.org/knorm/postgres)
[![coverage status](https://coveralls.io/repos/github/knorm/postgres/badge.svg?branch=master)](https://coveralls.io/github/knorm/postgres?branch=master)
[![dependency status](https://david-dm.org/knorm/postgres.svg)](https://david-dm.org/knorm/postgres)

Postgres plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)
that enables running queries agaisnt postgres. Also, it adds postgres-specific
features such as:

- [automatically JSON-stringifying](http://knexjs.org/#Schema-json) all `json`
  and `jsonb` fields before save (insert or update)
- automatically validating all `string` fields with `maxLength: 255`
- `limit`, `offset`, `returning` query options and `ilike` where option,
  via [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres)
- updating multiple rows using a single query with `UPDATE FROM`, via
  [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres)
- connection pooling, via [pg](https://node-postgres.com/features/pooling)
- transactions

## Installation

```bash
npm install --save @knorm/knorm @knorm/postgres
```

> @knorm/postgres has a peer dependency on
> [@knorm/knorm](https://www.npmjs.com/package/knorm)

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

| Option       | Type                 | Default    | Description                                                                                                                                                                                                                    |
| ------------ | -------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [name]       | `string`             | `postgres` | The name of the plugin, allows accessing the plugin instance via Knorm's plugin registry                                                                                                                                       |
| [connection] | `object` \| `string` | none       | Passed directly to [pg](https://node-postgres.com/features/connecting#programmatic). However, connections can also be configured via [environment variables](https://www.postgresql.org/docs/current/static/libpq-envars.html) |

Note that all options are optional.

## Usage

### JSON patching

When updating `json` and `jsonb` fields, you may wish to only update part of the
JSON data instead of the whole object. You can partially update json fields via
the `patch` option:

- set the option value to `true` to patch all the json and jsonb fields in the
  update data
- set the option value to a string field-name to patch a single field in the
  update data
- set the option value to an array of field-names to patch a multiple fields
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

Note that only basic json-patching is supported: only the first level of
patching
is supported. For nested objects and arrays, the whole object/array is
**replaced**:

```js
// before:
new User({
  jsonb: { top: { foo: 'foo' } },
  json: { top: { foo: 'foo' } }
});

// patch update:
User.query.patch(['json', 'jsonb']).update({
  jsonb: { top: { bar: 'bar' } },
  json: { top: { bar: 'bar' } }
});

// result:
new User({
  jsonb: { top: { bar: 'bar' } },
  json: { top: { bar: 'bar' } }
});
```

To patch nested objects or arrays, use
[jsonb_set](https://www.postgresql.org/docs/9.5/static/functions-json.html)
instead in a raw-sql update:

```js
// assuming the data is currently:
new User({
  jsonb: { top: { foo: 'foo' } },
  json: { top: { foo: 'foo' } }
});

// to add a nested `bar` key/value:
User.query.patch(['json', 'jsonb']).update({
  jsonb: User.query.sql(`jsonb_set("jsonb", '{top,bar}', '"bar"')`),
  // for plain json fields, you have to cast to jsonb and then cast the result
  // back to json:
  json: User.query.sql(`jsonb_set("json"::jsonb, '{top,bar}', '"bar"')::json`)
});

// result:
new User({
  jsonb: { top: { foo: 'foo', bar: 'bar' } },
  json: { top: { foo: 'foo', bar: 'bar' } }
});
```
