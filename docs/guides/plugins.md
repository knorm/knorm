# Plugins

Plugins modify the behaviour of `Field`, `Model` and `Query` classes simply by
overloading their methods.

Adding plugins to the ORM:

```js
const knorm = require('knorm');
const knormSoftDelete = require('knorm-soft-delete');

const { Model, Query } = knorm({ /* knorm options */ })
  .use(knormSoftDelete({ /* plugin options */ }));
```
> see [knorm-soft-delete](https://www.npmjs.com/package/knorm-soft-delete) for
this plugin's documentation

## Available plugins

| Plugin | Description |
| ------ | --------------------------------------------------- |
| [knorm-timestamps](https://www.npmjs.com/package/knorm-timestamps) | enables [timestamps](http://knexjs.org/#Schema-timestamps): adds support for `createdAt` and `updatedAt` fields |
| [knorm-soft-delete](https://www.npmjs.com/package/knorm-soft-delete) | enables soft-deletion: adds support for `deleted` and `deletedAt` fields |

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
  }
};

const { Model } = knorm({ /* knorm options */ }).use(preventDelete);

Model.delete().catch(console.log); // logs Error('deleting is not allowed!')
```

!> If you update the `Query` class then also update `Model.Query` so that models
use the updated `Query` class. Similarly, when you update the `Field` class,
also update `Model.Field`.
