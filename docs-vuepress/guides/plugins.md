# Plugins

Plugins modify the behaviour of `Field`, `Model` and `Query` classes simply by
overloading their methods.

To add plugins to the ORM:

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

> see [@knorm/relations](knorm-relations.md) for this plugin's documentation

## Available plugins

| Plugin                                     | Description                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| [@knorm/postgres](knorm-postgres.md)       | enables connecting to postgres                                             |
| [@knorm/to-json](knorm-to-json.md)         | adds a `toJSON` method to Model                                            |
| [@knorm/relations](knorm-relations.md)     | enables SQL joins                                                          |
| [@knorm/soft-delete](knorm-soft-delete.md) | enables soft-deletion: adds support for `deleted` and `deletedAt` fields   |
| [@knorm/paginate](knorm-paginate.md)       | adds a `count` method to Model and Query and adds query pagination options |
| [@knorm/timestamps](knorm-timestamps.md)   | enables timestamps: adds support for `createdAt` and `updatedAt` fields    |

## Creating custom plugins

A knorm plugin can be a function or an object with an `init` function. When you
add a plugin via `Knorm.prototype.use`, the function (or `init` function) is
called with the knorm instance. You can then modify the classes on the instance:

```js
const preventDelete = orm => {
  orm.Model.Query = orm.Query = class extends orm.Query {
    async delete() {
      throw new Error('deleting is not allowed!');
    }
  };
};

const { Model } = knorm({
  /* knorm options */
}).use(preventDelete);

Model.delete().catch(console.log); // logs Error('deleting is not allowed!')
```

!> If you update the `Query` class then also update `Model.Query` so that models
use the updated `Query` class. Similarly, when you update the `Field` class,
also update `Model.Field`.
