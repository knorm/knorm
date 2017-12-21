# Getting started

Knorm requires a [knex](http://knexjs.org) instance. Initialise a new ORM by
passing a knex instance:

```js
const knex = require('knex');
const knorm = require('knorm');

const orm = knorm({
  knex: knex({ /* knex options */ })
});
```
> the orm created contains `Model`, `Field`, `Query` and other knorm classes.

## Knorm options

These options are supported:

| Option | Type | Description                                        |
| --------------- | ---- | --------------------------------------------------- |
| `knex`          | function (__required__) | the knex instance |
| `fieldToColumn` | function | a function used to map field names to column names e.g. [snakeCase](https://lodash.com/docs/4.17.4#snakeCase) |

## Adding fields

If you have fields that are common to all your models, add them to the base
`Model` class. Since knorm requires models to have a primary field, `Model` is a
good place to add it. You could also add some convenience methods for working
with the primary field:

```js
const { Model: BaseModel } = new Knorm({ knex });

class Model extends BaseModel {
  static async fetchById(...args) {
    return this.fetchByPrimaryField(...args);
  }

  static async updateById(...args) {
    return this.updateByPrimaryField(...args);
  }

  static async deleteById(...args) {
    return this.deleteByPrimaryField(...args);
  }
}

Model.fields = {
  id: { type: 'integer', primary: true, updated: false }
};
```
> The field `type` is required. With only a few exceptions, these types map
one-to-one with the types you use with Knex's schema builder. See
[Model.fields](api/model.md#modelfields) for more info.

> The `updated` flag indicates that this field should not be updated when
updating a model.

> You can also override the primary field for any model that extends `Model`.
See [Model.primary](api/model.md#modelprimary) for more info.

## Adding models

Create new models by extending the `Model` class:

```js
class User extends Model {
  async confirm() {
    this.confirmed = true;
    return this.save();
  }
}

User.table = 'user'; // configure the table-name
User.fields = {
  name: {
    type: 'string',
    required: true, // validation rule
  },
  confirmed: {
    type: 'boolean',
    default: false // default value
  }
};
User.virtuals = {
  upperCaseName() {
    return this.name ? this.name.toUpperCase() : undefined;
  }
};
```
> See [the validation guide](guides/validation.md) for more info on validation

> See [Model.fields](api/model.md#modelfields) for more info on field configs

> See [Model.virtuals](api/model.md#modelvirtuals) for more info on virtuals

A child model inherits all fields (and virtuals) added to its parent, so `User`
will also have the `id` field. However, fields added to the child model will not
be added to the parent.

See [the Model docs](api/model.md) for more info on
[field inheritance](api/model.md#modelfields) and
[virtuals inheritance](api/model.md#modelvirtuals).

## Example

```js
(async function () {
  const userCount = await User.count();
  const confirmedUsers = await User.fetch({ where: { confirmed: true }});
  const updatedUsers = await new Transaction(async transaction => {
    const unconfirmedUserCount = await User.query
      .transaction(transaction)
      .where({ confirmed: false })
      .count();

    if (!unconfirmedUserCount) {
      return;
    }

    return User.query
      .transaction(transaction)
      .where({ confirmed: false })
      .update({ confirmed: true });
  });
})();
```
