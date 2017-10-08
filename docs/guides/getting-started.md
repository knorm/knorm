# Getting started

## Set up knex

Knorm has a peer dependency on [knex](http://knexjs.org). If you haven't
installed it yet, [install it now](http://knexjs.org/#Installation).

> For simplicity, this guide assumes that you have

As an example, let's set up a postgres connection:

```js
const knex = require('knex'){
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'your_database_user',
    password : 'your_database_password',
    database : 'myapp_test'
  }
});
```
> Note that you should only use one knex instance throughout your application.

## Set up the ORM

To create an ORM, extend the Query, Model and Transaction (if needed) exported
by knorm. You can then configure the ORM with the knex instance that will be
used for interacting with the database:

```js
const knorm = require('knorm');
const { Query: KnormQuery, Model: KnormModel, Transaction: KnormTransaction } = knorm;

class Query extends KnormQuery {}
Query.knex = knex; // the knex instance

class Transaction extends KnormTransaction {}
Transaction.knex = knex; // the knex instance

class Model extends KnormModel {}
Model.Query = Query; // Model uses Query for executing database operations
```
> You should always extend the classes provided by knorm and configure the
child classes, especially if you want to create several ORMs in the same
application.

### Configure field-name to column-name mapping (optional)

If you need to snake-case field names or put hyphens in there or something of
this nature, you can override the `Field` class and then configure `Model`
appropriately:

```js
const { snakeCase } = require('lodash');
const { Field: KnormField } = knorm;

class Field extends KnormField {
  getColumnName(fieldName) {
    return snakeCase(fieldName);
  }
}

Model.Field = Field; // update Model with the new Field class
```

### Configure common fields (optional)

If you have fields that are common to all your models, add them to the base
`Model` class. Knorm requires models to have an `id` field, `Model` is a good
place to add it:

```js
Model.fields = {
  id: {
    type: 'integer'
  }
};
```
> The `type` is required. With only a few exceptions, these types map one-to-one
with the types you use with Knex's schema builder.

If your `id` field has a name other than `id`, you can configure the field name:

```js
Model.fieldNames = {
  id: 'uuid'
};
// In this case your base fields will be something like:
Model.fields = {
  uuid: {
    type: 'uuid',
    required: true // validation rule
  }
};
```
> You can also override the field-name for any model that extends `Model`

> To add [timestamps](http://knexjs.org/#Schema-timestamps) support, check out
the [knorm-timestamps](https://www.npmjs.com/package/knorm-timestamps) plugin

## Add models

Then you're ready to add some models:

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

`User` will inherit all the fields (add virtuals) added to `Model` so it'll also
have the `id` field. This will also work with thier child classes, so if you
create an `Employee` model that inherits from `User` it will get all the fields
defined in `User` and `Model`. You can use this to build more complicated ORMs.

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
