---
title: '@knorm/to-json'
---

[toJSON](<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior>)
plugin for Knorm.

Knorm plugin that adds a
[toJSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON()_behavior)
method to Knorm's `Model` class and allows configuring what fields should be
excluded from the output.

## Installation

```bash
npm install --save @knorm/knorm @knorm/to-json
```

> @knorm/to-json has a peer dependency on @knorm/knorm

## Usage

```js
const knorm = require('@knorm/knorm');
const knormToJSON = require('@knorm/to-json');

const orm = knorm({
  // knorm options
}).use(
  knormToJSON({
    // @knormToJSON options
  })
);
```

### Options

| Option    | Type                | Default  | Description                                                                                                          |
| --------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| [name]    | `string`            | `toJSON` | The name of the plugin, allows accessing the plugin instance via Knorm's plugin registry (`Knorm.prototype.plugins`) |
| [exclude] | `array` \| `string` | `[]`     | A string or array of property-names (object keys) to exclude from the `toJSON` output                                |

## Features

### Excluding fields per model

You can configure fields to exclude via Model options:

```js
const { Model } = knorm().use(
  knormToJSON({
    exclude: 'id' // exclude the `id` by default for all models
  })
);

Model.fields = { id: 'integer' };

class User extends Model {}

User.fields = { username: 'string', password: 'string' };
User.options = {
  plugins: {
    toJSON: {
      exclude: 'password' // also exclude `password` for the `User` model
    }
  }
};
```
