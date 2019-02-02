# @knorm/soft-delete

Soft-delete plugin for Knorm. This plugin adds soft-deletion fields to the
[Model](/api.md#model) class and updates [Query](/api.md#query) methods to
enable soft-deletion.

## Installation

```bash
npm install --save @knorm/knorm @knorm/soft-delete
```

> @knorm/soft-delete has a peer dependency on @knorm/knorm

## Usage

```js
const knorm = require('@knorm/knorm');
const knormSoftDelete = require('@knorm/soft-delete');

const orm = knorm({
  // knorm options
}).use(
  knormSoftDelete({
    // knormSoftDelete options
  })
);
```

### Options

| Option             | Type                | Default       | Description                                                                                                              |
| ------------------ | ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [name]             | `string`            | `soft-delete` | The name of the plugin, allows accessing the plugin instance via Knorm's [plugin registry](/api.md#knorm-plugins-object) |
| [exclude]          | `array` \| `string` | `[]`          | A string or array of property-names (object keys) to exclude from the `toJSON` output                                    |
| [deleted]          | `object`            |               | Config options for the `deleted` field.                                                                                  |
| [deleted.name]     | `string`            | `deleted`     | The field-name for the `deleted` field                                                                                   |
| [deleted.column]   | `string`            | `deleted`     | The column-name for the `deleted` field                                                                                  |
| [deletedAt]        | `object`            |               | Config options for the `deletedAt` field.                                                                                |
| [deletedAt.name]   | `string`            | `deletedAt`   | The field-name for the `deletedAt` field                                                                                 |
| [deletedAt.column] | `string`            | `deleted_at`  | The column-name for the `deletedAt` field                                                                                |

## Features

### Soft deletion

This plugin:

- adds `deleted` and `deletedAt` (if enabled) fields to the Model class
- modifies [Query](/api.md#query)'s
  [delete](/api.md#query-delete-options-%E2%87%92-promise) method such that
  it does not actually delete a row but rather sets the `deleted` field to
  `true` and `deletedAt` to the current time (i.e. `new Date()`) if the field is
  enabled.
- modifies [Query](/api.md#query)'s
  [insert](/api.md#query-insert-data-options-%E2%87%92-promise) method to set
  `deleted` to `false` before insert.
- modifies [Query](/api.md#query)'s
  [fetch](/api.md#query-fetch-options-%E2%87%92-promise),
  [update](/api.md#query-update-data-options-%E2%87%92-promise) and
  [delete](/api.md#query-delete-options-%E2%87%92-promise) methods such that
  they always filter out soft-deleted rows (i.e. with `deleted` set to `true`).

To work with soft-deleted rows, use the `Query.prototype.withDeleted`,
`Query.prototype.onlyDeleted` query options or directly use the
`Query.prototype.where` query option:

```js
class User extends Model {}

User.fields = {
  id: 'integer',
  names: 'string'
  // `deleted` is added by @knorm/soft-delete
};

// to update only soft-deleted rows:
User.update({ names: 'Foo Bar' }, { onlyDeleted: true });
// or:
User.update({ foo: 'bar' }, { where: { deleted: true } });

// to fetch rows including soft-deleted rows:
User.query
  .withDeleted()
  .where({ foo: 'bar' })
  .fetch();
// or:
User.query
  .where(
    Model.where.and({ foo: 'bar' }, Model.where.in({ deleted: [true, false] }))
  )
  .fetch();
```

::: tip INFO
`withDeleted` performs better than `Model.where.in({ deleted: [true, false] })`
:::

::: tip INFO
If directly using the `where` query option, the field-name to use for the
`deleted` field depends on the field's configuration.
:::

### Restoration

This plugin also adds `Query.prototype.restore`, `Model.prototype.restore` and
`Model.restore` methods that can be used to restore soft-deleted records:

```js
// to soft-delete:
new User({ id: 1 }).delete();
// to restore:
new User({ id: 1 }).restore();
// or:
User.restore({ where: { id: 1 } });
```

### Hard deletion

Conversely, it also adds `Query.prototype.hardDelete`,
`Model.prototype.hardDelete` and `Model.hardDelete` that can be used to
hard-delete records:

```js
// to hard-delete:
new User({ id: 1 }).hardDelete();
// or:
User.hardDelete({ where: { id: 1 } });
```
