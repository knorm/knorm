---
title: '@knorm/paginate'
---

Pagination plugin for @knorm/knorm.

## Installation

```bash
npm install --save @knorm/knorm @knorm/paginate
```

> @knorm/paginate has a peer dependency on @knorm/knorm

## Usage

```js
const knorm = require('@knorm/knorm');
const knormPaginate = require('@knorm/paginate');

const orm = knorm({
  // knorm options
}).use(
  knormPaginate({
    // knormPaginate options
  })
);
```

### Options

| Option    | Type   | Default    | Description                                                                                                          |
| --------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| [name]    | string | `paginate` | The name of the plugin, allows accessing the plugin instance via Knorm's plugin registry (`Knorm.prototype.plugins`) |
| [page]    | number | `1`        | The default `page` value to use if only `perPage` is set in [query options](/guides/queries.md?id=setting-options)   |
| [perPage] | number | `10`       | The default `perPage` value to use if only `page` is set in [query options](/guides/queries.md?id=setting-options)   |

## Features

### Count

This plugin adds `Query.prototype.count` and `Model.count` methods that enable
counting the number of rows in a table:

```js
class User extends Model {}

User.fields = {
  id: 'integer',
  names: 'string'
  // `deleted` is added by @knorm/soft-delete
};

// to count all the rows:
User.count();

// to count specific rows:
User.count({ where: { names: 'Foo Bar' } });

// in conjunction with @knorm/soft-delete, to count soft-deleted rows:
// to fetch rows including soft-deleted rows:
User.count({ onlyDeleted: true });

// in conjunction with @knorm/relations, to count rows with a related row in
// another model:
User.count({ innerJoin: Image });
```

### Pagination

This plugin adds the following query options for the `Query.prototype.fetch`
method:

- `Query.prototype.page` _number_ / _string_, _default: `1`_ - the page to fetch
  rows from. This can also be passed as `first` and `last`.
- `Query.prototype.perPage` _number_, _default: `10`_ - how many records to fetch per page
- `Query.prototype.withPaginationData` _boolean_, _default: `true`_ - whether or
  not to return pagination data or only the rows from the fetch

```js
User.fetch({ page: 2 });
// sample result:
// {
//   total: 500,
//   page: 2,
//   perPage: 10,
//   rows: [
//     new User({ id: 11, name: 'User 11' }),
//     new User({ id: 12, name: 'User 12' }),
//     new User({ id: 13, name: 'User 13' }),
//     new User({ id: 14, name: 'User 14' }),
//     new User({ id: 15, name: 'User 15' }),
//     new User({ id: 16, name: 'User 16' }),
//     new User({ id: 17, name: 'User 17' }),
//     new User({ id: 18, name: 'User 18' }),
//     new User({ id: 19, name: 'User 19' }),
//     new User({ id: 20, name: 'User 20' })
//   ]
// }

User.fetch({ page: 'last', perPage: 3 });
// sample result:
// {
//   total: 500,
//   page: 167,
//   perPage: 3,
//   rows: [
//     new User({ id: 498, name: 'User 498' }),
//     new User({ id: 499, name: 'User 499' }),
//     new User({ id: 500, name: 'User 500' })
//   ]
// }

User.fetch({ page: 'last', perPage: 3, withPaginationData: false });
// sample result:
// [
//   new User({ id: 498, name: 'User 498' }),
//   new User({ id: 499, name: 'User 499' }),
//   new User({ id: 500, name: 'User 500' })
// ]
```
