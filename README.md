# knorm

[![npm version](https://badge.fury.io/js/knorm.svg)](http://badge.fury.io/js/knorm)
[![build status](https://travis-ci.org/joelmukuthu/knorm.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm.svg)](https://david-dm.org/joelmukuthu/knorm)
[![Greenkeeper badge](https://badges.greenkeeper.io/joelmukuthu/knorm.svg)](https://greenkeeper.io/)

A purely ES6 class-based ORM for [Knex.js](http://knexjs.org). Features:
- model validation (before insert and update operations) with custom error
  classes and support for async custom validators
- SQL joins with full JavaScript syntax
- virtual fields (i.e. computed fields) with support for async getters
- model field names to database column names transformations (and vice-versa
  e.g. snake-casing)
- custom error classes (custom for every model class created) for db errors
- improved syntax for transactions
- full and easy configuration and extendability (owing to ES6 classes)
- good test coverage

## NOTE: currently supports [PostgreSQL, MSSQL and Oracle databases](http://knexjs.org/#Builder-returning)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Usage](#usage)
  - [1. Set up knex](#1-set-up-knex)
  - [2. Configure your ORM](#2-configure-your-orm)
    - [2.1. Configure field-name to column-name mapping (optional)](#21-configure-field-name-to-column-name-mapping-optional)
    - [2.2. Configure common fields (optional)](#22-configure-common-fields-optional)
  - [3. Add some model classes](#3-add-some-model-classes)
  - [4. Example](#4-example)
- [Docs](#docs)
- [TODOs](#todos)
- [Credits](#credits)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation
```bash
npm install --save knorm knex
```
> knorm has a peer dependency on [knex](https://www.npmjs.com/package/knex)

## Usage
### 1. Set up knex

We'll create a postgres connection as an example:

```js
const knex = require('knex'){
  client: 'pg',
  connection: 'postgres://postgres-connection-string',
});
```
> Note that you should only use one knex instance throughout your application.

### 2. Configure your ORM

Then configure your ORM with the knex instance:

```js
const {
  Query: KnormQuery,
  Model: KnormModel,
  Transaction: KnormTransaction,
} = require('knorm');

class Query extends KnormQuery {}
Query.knex = knex; // the knex instance

class Transaction extends KnormTransaction {}
Transaction.knex = knex; // the knex instance

class Model extends KnormModel {}
Model.Query = Query; // Model needs Query
```
> You should always extend the classes provided by knorm and configure the
child classes, especially if you want to create several ORMs in the same
application.

#### 2.1. Configure field-name to column-name mapping (optional)

If you need to snake-case field names or put hyphens in there or something of
this nature, you can override the `Field` class and then configure `Model`
appropriately:

```js
const { Field: KnormField } = require('knorm');

class Field extends KnormField {
  getColumnName(fieldName) {
    return fieldName.toLowerCase(); // for example
  }
}

Model.Field = Field; // configure the new Field class
```

#### 2.2. Configure common fields (optional)

If you have fields that are common to all your models, add them to the base
`Model` class. Knorm requires models to have an `id` field, `Model` is a good
place to add it:

```js
Model.fields = {
  id: {
    type: Field.types.integer,
    required: true // This is a validation rule
  },
  createdAt: {
    type: Field.types.dateTime,
    default: () => new Date() // default values can be plain values or functions
  },
  updatedAt: {
    type: Field.types.dateTime,
    default: () => new Date()
  }
};
// Note that the 'required' and 'default' field options are optional; however,
// 'type' is required.
// With a few exceptions, these types map one-to-one with the types you use
// with Knex's schema builder.
```

If your `id` or timestamp fields have names other than `id`, `createdAt` and
`updatedAt` respectively, you can configure that as well:

```js
Model.idField = 'uuid';
Model.createdAtField = 'created';
Model.updatedAtField = 'updated';
// In this case your base fields will be something like:
Model.fields = {
  uuid: {
    type: Field.types.uuid,
    required: true
  },
  created: {
    type: Field.types.dateTime,
    default: () => new Date()
  },
  updated: {
    type: Field.types.dateTime,
    default: () => new Date()
  }
};
// You can also override this for any model that extends Model
```

### 3. Add some model classes

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
    type: Field.types.string, // type is also used a validation rule
    required: true, // validation rule
    minLength: 2,  // validation rule
    maxLength: 100, // validation rule
    async validate(val) { // custom validation
      const hasNumbers = /[0-9]/.test(val);
      if (hasNumbers) {
        return false; // or: throw new CustomValidationError();
      }
    }
  },
  confirmed: {
    type: Field.types.boolean,
    default: false
  }
};

class Message extends Model {}
Message.table = 'message';
Message.fields = {
    text: {
        type: Field.types.text,
        required: true,
    },
    senderId: {
        type: Field.types.integer,
        references: User.fields.id, // these references are used for SQL joins
    },
    receiverId: {
        type: Field.types.integer,
        references: User.fields.id,
    },
    read: {
      type: Field.types.boolean,
      default: false
    }
};
```

You can also define virtual fields. If virtuals are defined on a model, every
instance of the model will have the virtual's getters/setters added.

```js
Message.virtuals = {
  upperCaseText() { // shortcut to defining a virtual with only a getter
    return this.text.toUpperCase();
  },
  someOtherVirtual: {
    async get() {}, // async virtual getters are also supported
    set(val) {}
  }
}
```

`User` and `Message` will inherit all the fields (add virtuals) added to `Model`
so they'll also have the `id`, `createdAt` and `updatedAt` fields. This will
also work with thier child classes, so if you create an `Employee` model that
inherits from `User` it will get all the fields defined in `User` and `Model`.
You can use this scheme to build more complicated ORMs.

### 4. Example

With this setup you'll be able to achieve the following:

```js
const emailConfirmedUsersWithUnreadMessages => async () => {
  const confirmedUserCount = await User.query
    .where({ confirmed: true })
    .count({ field: User.fields.id }); // or { field: 'id' }

  if (confirmedUserCount < 1) {
    return;
  }

  const confirmedUsersWithUnreadMessages = await User.query
    .where({ confirmed: true })
    .join( // this does a LEFT JOIN from the 'user' to the 'message' table
      Message.query
        .on('receiverId')
        .as('unreadMessages')
        .where({ read: false })
    )
    .fetch();

  await Promise.all(confirmedUsersWithUnreadMessages.map(async user => {
    const { unreadMessages } = user;

    if (!unreadMessages || !unreadMessages.length) {
      return;
    }

    // assuming User had a `sendEmail` method
    await user.sendEmail(`You have ${unreadMessages.length} unread messages`);
  }));
};
```

## Docs
Current documentation:
- [Model](./doc/Model.md)
- [Query](./doc/Query.md)
- [Field](./doc/Field.md)

## TODOs

- build and test ES5 classes and include them in releases
- add documentation (in the meantime, the tests are a good source of
  documentation)
- run tests against other databases besides PostgreSQL
- add support for databases that don't support RETURNING clauses
- add a tool to generate models from DESCRIBE queries

> run `npm run todo` to see TODOs in the code

PRs are very welcome!

## Credits

Knorm is inspired in part by the [Mongoose](http://mongoosejs.com/) and
[Bookshelf](http://bookshelfjs.org/) APIs.
