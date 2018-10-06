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
and a `name` property. See [knorm.use](/api.md#knorm-use-plugin-⇒-knorm) for
more info.

When a plugin is loaded via [knorm.use](/api.md#knorm-use-plugin-⇒-knorm), the
function (or object's `init` function) is called with the `knorm` instance. The
plugin can then modify the classes on the instance:

```js
const preventDelete = orm => {
  class YouShallNotDelete extends orm.Query {
    async delete() {
      throw new Error('deleting is not allowed!');
    }
  }

  orm.Model.Query = orm.Query = YouShallNotDelete;
};

const { Model } = knorm({
  /* knorm options */
}).use(preventDelete);

Model.delete().catch(console.log); // logs Error('deleting is not allowed!')
```

::: warning NOTE
If you update knorm's `Query` class then also update
[Model.Query](/api.html#knorm-query-query) so that models use the updated
`Query` class. Similarly, when you update the `Field` class, also update
[Model.Field](/api.html#knorm-field-field).
:::
