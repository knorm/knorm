# knorm

[![npm version](https://badge.fury.io/js/knorm.svg)](http://badge.fury.io/js/knorm)
[![build status](https://travis-ci.org/joelmukuthu/knorm.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm.svg)](https://david-dm.org/joelmukuthu/knorm)
[![Greenkeeper badge](https://badges.greenkeeper.io/joelmukuthu/knorm.svg)](https://greenkeeper.io/)

knorm is a purely ES6 class-based ORM for [Knex.js](http://knexjs.org).

## Supported environments

These environments are currently supported:

| Environment | Value | Description                                        |
| ----------- | ---- | --------------------------------------------------- |
| Node.js     | Version >= 7.6. | knorm uses `async/await` |
| Databases   | PostgreSQL, MSSQL and Oracle | knorm uses the [RETURNING clause](http://knexjs.org/#Builder-returning) |

## Creating an ORM

Install knorm (and [knex](http://knexjs.org) if you haven't installed it yet):

```bash
npm install --save knex knorm
```

Creating a new ORM:

```js
const knorm = require('knorm');
const knex = require('knex')({ /* knex options */ });

const { Model, Query, Field } = knorm({ knex });
```
> see the [Knorm docs](api/knorm.md#knorm) for more info on Knorm options

## Adding common fields

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
async function example() {
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
};
```
