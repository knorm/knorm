---
title: Plugins
---

Plugins modify the behaviour of `Field`, `Model` and `Query` classes simply by
overloading their methods.

To load plugins into the ORM, use `Knorm.prototype.use`:

```js
const knorm = require('@knorm/knorm');
const knormRelations = require('@knorm/relations');

const { Model, Query } = knorm({
  /* knorm options */
}).use(
  knormRelations({
    /* plugin options */
  })
);
```

> see [@knorm/relations](plugins/relations.md) for this plugin's documentation

## Available plugins

| Plugin                                        | Description                          |
| --------------------------------------------- | ------------------------------------ |
| [@knorm/postgres](plugins/postgres.md)       | enables connecting to postgres       |
| [@knorm/to-json](plugins/to-json.md)         | adds a `toJSON` method to Model      |
| [@knorm/relations](plugins/relations.md)     | enables SQL joins                    |
| [@knorm/soft-delete](plugins/soft-delete.md) | enables soft-deletion                |
| [@knorm/paginate](plugins/paginate.md)       | enables counting and paginating rows |
| [@knorm/timestamps](plugins/timestamps.md)   | enables timestamps                   |

## Creating custom plugins

A Knorm plugin can be any _named_ function or an object with an `init` function
and a `name` property. See
`Knorm.prototype.use` more info.

When a plugin is loaded via `Knorm.prototype.use`, the function (or object's
`init` function) is called with the `knorm` instance. The plugin can then modify
the classes on the instance:

```js
const preventDelete = knorm => {
  class YouShallNotDelete extends knorm.Query {
    async delete() {
      throw new Error('deleting is not allowed!');
    }
  }

  knorm.updateQuery(YouShallNotDelete);
};

const { Model } = knorm().use(preventDelete);

Model.delete().catch(console.log);
// result:
// Error('deleting is not allowed!')
```

:::tip info
`Knorm` provides some utility methods for plugins to update the instance's
classes:

- `Knorm.prototype.updateTransaction`
- `Knorm.prototype.updateModel`
- `Knorm.prototype.updateQuery`
- `Knorm.prototype.updateField`
- `Knorm.prototype.updateConnection`

:::
