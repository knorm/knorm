# Plugins

Plugins modify the behaviour of `Field`, `Model` and `Query` classes simply by
overloading their methods.

To load plugins into the ORM, use
[knorm.use](/api.md#knorm-use-plugin-%E2%87%92-knorm):

```js
const knorm = require('@knorm/knorm');
const knormRelations = require('@knorm/relations');

const { Model, Query } = knorm(/* knorm options */)
  .use(knormRelations(/* plugin options */));
```

> see [@knorm/relations](https://github.com/knorm/relations) for this plugin's documentation

## Available plugins

| Plugin                                     | Description                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| [@knorm/postgres](https://github.com/knorm/postgres)       | enables connecting to postgres                                             |
| [@knorm/to-json](https://github.com/knorm/to-json)         | adds a `toJSON` method to Model                                            |
| [@knorm/relations](https://github.com/knorm/relations)     | enables SQL joins                                                          |
| [@knorm/soft-delete](https://github.com/knorm/soft-delete) | enables soft-deletion: adds support for `deleted` and `deletedAt` fields   |
| [@knorm/paginate](https://github.com/knorm/paginate)       | adds a `count` method to Model and Query and adds query pagination options |
| [@knorm/timestamps](https://github.com/knorm/timestamps)   | enables timestamps: adds support for `createdAt` and `updatedAt` fields    |

## Creating custom plugins

A Knorm plugin can be any *named* function or an object with an `init` function
and a `name` property. See
[Knorm.prototype.use](/api.md#knorm-use-plugin-%E2%87%92-knorm) more info.

When a plugin is loaded via
[Knorm.prototype.use](/api.md#knorm-use-plugin-%E2%87%92-knorm), the  function
(or object's `init` function) is called with the `knorm` instance. The plugin
can then modify the classes on the instance: 

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

Model.delete().catch(console.log); // logs Error('deleting is not allowed!')
```

::: tip INFO
[Knorm](/api.md#knorm) provides some utility methods for plugins to update the
instance's classes: 

- [Knorm.prototype.updateTransaction](/api.md#knorm-updatetransaction-transaction-%E2%87%92-knorm)
- [Knorm.prototype.updateModel](/api.md#knorm-updatemodel-model-%E2%87%92-knorm)
- [Knorm.prototype.updateQuery](/api.md#knorm-updatequery-query-%E2%87%92-knorm)
- [Knorm.prototype.updateField](/api.md#knorm-updatefield-field-%E2%87%92-knorm)
- [Knorm.prototype.updateConnection](/api.md#knorm-updateconnection-connection-%E2%87%92-knorm)

:::
