# Getting started

## Set up knex

Knorm has a peer dependency on [knex](http://knexjs.org). If you haven't
installed it yet, [install it now](http://knexjs.org/#Installation).

As an example, let's set up a postgres connection:

```js
const knex = require('knex'){
  client: 'pg',
  connection: 'postgres://user:password@127.0.0.1:5432/database'
});
```
> Note that you should only use one knex instance throughout your application.

## Set up the ORM

To create an ORM, use the Knorm constructor and pass the `knex` instance, among
other [options](#knorm-options).

```js
const Knorm = require('knorm');
const orm = new Knorm({ knex });
```
> the orm created contains `Model`, `Field`, `Query` and other knorm classes.

### Knorm options

These options are supported:

| Option | Type | Description                                        |
| ------ | ---- | --------------------------------------------------- |
| `knex` | function (__required__) | the knex instance |
| `fieldNameToColumnName` | function | a function used to map field names to column names e.g. [snakeCase](https://lodash.com/docs/4.17.4#snakeCase) |

### Configure common fields (optional)

If you have fields that are common to all your models, add them to the base
`Model` class. Since knorm requires models to have a primary field, `Model` is a
good place to add it. You could also add some convenience methods for working
with your primary field:

```js
const orm = new Knorm({ knex });

class Model extends orm.Model {
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
  id: { type: 'integer', primary: true }
};
```
> The field `type` is required. With only a few exceptions, these types map
one-to-one with the types you use with Knex's schema builder. See
[Model.fields](api/model.md#modelfields) for more info.

> You can also override the primary field for any model that extends `Model`.
See [Model.primary](api/model.md#modelprimary) for more info.

> To add [timestamps](http://knexjs.org/#Schema-timestamps) support, check out
the [knorm-timestamps](https://www.npmjs.com/package/knorm-timestamps) plugin

## Add models

Then you can create some models:

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
    type: 'string', // type is also used a validation rule
    required: true, // validation rule
    minLength: 2,  // validation rule
    maxLength: 100, // validation rule
    async validate(val) { // custom validation
      const hasNumbers = /[0-9]/.test(val);
      if (hasNumbers) {
        return false; // or: throw new SomeCustomValidationError();
      }
    }
  },
  confirmed: {
    type: 'boolean',
    default: false
  }
};
```
> See [the validation guide](guides/validation.md) for more info on validation

> See [Model.fields](api/model.md#modelfields) for more info on field configs

You can also define virtual fields. If virtuals are defined on a model, every
instance of the model will have the virtual's getters/setters added.

```js
User.virtuals = {
  upperCaseName() { // shortcut to defining a virtual with only a getter
    return this.name ? this.name.toUpperCase() : undefined;
  },
  someOtherVirtual: {
    async get() {}, // async virtual getters are also supported
    set(val) {}
  }
}
```
> See [Model.virtuals](api/model.md#modelvirtuals) for more info on virtuals

`User` will inherit all the fields (add virtuals) added to `Model` so it'll also
have the `id` field. This will also work with thier child classes, so if you
create an `Employee` model that inherits from `User` it will get all the fields
defined in `User` and `Model`. You can use this to build more complicated ORMs.
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
