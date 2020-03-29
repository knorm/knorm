---
title: '@knorm/postgres'
---

Postgres plugin for Knorm that enables running queries against PostgreSQL.

## Installation

```bash
npm install --save @knorm/knorm @knorm/postgres
```

> @knorm/postgres has a peer dependency on @knorm/knorm

## Usage

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

### Options

| Option       | Type                 | Default    | Description                                                                                                                                                                                                                    |
| ------------ | -------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [name]       | `string`             | `postgres` | The name of the plugin, allows accessing the plugin instance via Knorm's [plugin registry](/api.md#knorm-plugins-object)                                                                                                       |
| [connection] | `object` \| `string` | none       | Passed directly to [pg](https://node-postgres.com/features/connecting#programmatic). However, connections can also be configured via [environment variables](https://www.postgresql.org/docs/current/static/libpq-envars.html) |

## Features

This plugin adds these postgres-specific features:

- automatically `JSON-stringify`ing all `json` and `jsonb` fields before save
  (insert or update)
- automatically validating all `string` fields with `maxLength: 255`
- `limit`, `offset`, `returning` query options and `ilike` where option,
  via [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres)
- updating multiple rows using a single query with `UPDATE FROM`, via
  [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres)
- connection pooling, via [pg](https://node-postgres.com/features/pooling)

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
  id: {
    type: 'integer'
  },
  name: {
    type: 'jsonb',
    shape: {
      first: 'string',
      last: 'string'
    }
  },
  data: {
    type: 'jsonb',
    shape: {
      image: {
        type: 'object',
        shape: {
          mime: 'string',
          filename: 'string'
        }
      }
    }
  }
};

const user = new User({ id: 1, name: { first: 'John' } });

// to update whole `name` object without patching:
user.update({ name: { last: 'Doe' } });
// result: new User({ id: 1, name: { last: 'Doe' } });

// to patch the `name` object instead:
User.update({ name: { last: 'Doe' } }, { patch: 'name' });
// result: new User({ id: 1, name: { first: 'John', last: 'Doe' } });
```

To patch multiple `json` and `jsonb` fields in an update:

```js
User.update(data, { patch: ['someField', 'someOtherField'] });
```

To patch all `json` and `jsonb` fields contained in the update data:

```js
User.update(data, { patch: true });
```

:::important note
Only basic json-patching is supported: only the first level of patching is
supported. If a nested object is passed, the nested keys are **replaced**:
:::

```js
const user = new User({
  id: 1,
  data: {
    image: { type: 'image/jpeg', filename: 'image-1.jpg' }
  }
});

// in this update, the whole `image` object gets replaced:
user.update({ data: { image: { type: 'image/png' } }, { patch: true });
// result: new User({ id: 1, data: { image: { type: 'image/png' } } });
```

To patch nested objects, use
[jsonb_set](https://www.postgresql.org/docs/9.5/static/functions-json.html)
instead in a raw-sql update:

```js
const value = JSON.stringify({ type: 'image/png' });

user.update(
  { data: User.query.sql(`jsonb_set("data", '{image,type}', '${value}')`) },
  { patch: true }
);

// result:
// new User({
//   id: 1,
//   data: {
//     image: { type: 'image/png', filename: 'image-1.jpg' }
//   }
// });
```

Note that for plain `json` fields, you have to cast to `jsonb` and then cast the
result back to `json`:. So assuming `data` was a `json` field, the update would
be:

```js
const value = JSON.stringify({ type: 'image/png' });
const sql = `jsonb_set("data"::jsonb, '{image,type}', '${value}')::json`;

user.update({ data: User.query.sql(sql) }, { patch: true });
```
