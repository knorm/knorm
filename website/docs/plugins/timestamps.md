---
title: '@knorm/timestamps'
---

Knorm plugin that automates working with `created_at` and `updated_at` table
fields.

## Installation

```bash
npm install --save @knorm/knorm @knorm/timestamps
```

> @knorm/timestamps has a peer dependency on @knorm/knorm

## Usage

```js
const { knorm } = require('@knorm/knorm');
const { knormTimestamps } = require('@knorm/timestamps');

const orm = knorm({
  // knorm options
}).use(
  knormTimestamps({
    // knormTimestamps options
  })
);
```

### Options

| Option             | Type     | Default      | Description                                                                                                          |
| ------------------ | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| [name]             | `string` | `timestamps` | The name of the plugin, allows accessing the plugin instance via Knorm's plugin registry (`Knorm.prototype.plugins`) |
| [createdAt]        | `object` |              | Config options for the `createdAt` field.                                                                            |
| [createdAt.name]   | `string` | `createdAt`  | The field-name for the `createdAt` field.                                                                            |
| [createdAt.column] | `string` | `created_at` | The column-name for the `createdAt` field.                                                                           |
| [updatedAt]        | `object` |              | Config options for the `updatedAt` field.                                                                            |
| [updatedAt.name]   | `string` | `updatedAt`  | The field-name for the `updatedAt` field.                                                                            |
| [updatedAt.column] | `string` | `updated_at` | The column-name for the `updatedAt` field.                                                                           |

## Features

This plugin:

- adds `createdAt` and `updatedAt` fields to the `Model` class
- modifies `Query.prototype.insert` method such that the `createdAt` and
  `updatedAt` fields are set to the current time (i.e. `new Date()`)
- modifies `Query.prototype.update` method to set the `updatedAt` field is set
  to the current time (i.e. `new Date()`) before update.

:::tip info

- If `Query.prototype.insert` is passed data where `createdAt` and `updatedAt`
  are already set, they are left as is.
- If `Query.prototype.update` is passed data where `createdAt` is set, it's
  removed before the updated. `updatedAt` is always set to the current time.

:::
