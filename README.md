# knorm

[![npm version](https://badge.fury.io/js/knorm.svg)](http://badge.fury.io/js/knorm)
[![build status](https://travis-ci.org/joelmukuthu/knorm.svg?branch=master)](https://travis-ci.org/joelmukuthu/knorm)
[![coverage status](https://coveralls.io/repos/github/joelmukuthu/knorm/badge.svg?branch=master)](https://coveralls.io/github/joelmukuthu/knorm?branch=master)
[![dependency status](https://david-dm.org/joelmukuthu/knorm.svg)](https://david-dm.org/joelmukuthu/knorm)

A purely class-based ORM for [Knex.js](http://knexjs.org) with built-in support
for validation, joins, snake-casing column names...

## NOTE: This is currently in active development

## Installation
```bash
npm install --save knorm
```
Knorm has a peer dependency on Knex.js so you'll also need to install
[knex](https://www.npmjs.com/package/knex) if you haven't done so already.

## Usage
First, set up your knex connection. We'll create a postgres connection as an
example:
```js
const knex = require('knex'){
  client: 'pg',
  connection: 'postgres://postgres-connection-string',
});
// Note that you should only use one knex instance throughout your application.
```
Then configure your ORM with the knex instance:
```js
const {
  Model: AbstractModel,
  Query: AbstractQuery,
  Transaction: AbstractTransaction,
} = require('knorm');

class Query extends AbstractQuery {}
Query.knex = knex; // the knex instance

class Transaction extends AbstractTransaction {}
Transaction.knex = knex; // the knex instance

class Model extends AbstractModel {}
Model.Query = Query; // use the Query class with the knex instance configured

```
If you need to snake-case field names or put hyphens in there or something of
this nature, you can override the `Field` class and configure `Model`
appropriately:
```js
const { Field: AbstractField } = require('knorm');

class Field extends AbstractField {
  getColumnName(fieldName) {
    return fieldName.toLowerCase(); // for example
  }
}

Model.Field = Field; // configure the new Field class
```
You can configure `Model` further. For instance, if you have fields that are
common to all your models, add them to the base `Model` class:
```js
Model.fields = {
  id: {
    type: Field.types.integer,
    required: true, // This is a validation rule
  },
  createdAt: {
    type: Field.types.dateTime,
    default: () => new Date(),
  },
  updatedAt: {
    type: Field.types.dateTime,
    default: () => new Date(),
  },
};
// Note that the 'required' and 'default' field options are optional; however,
// 'type' is required.
// With a few exceptions, these types map one-to-one with the types you use
// with Knex's schema builder.
```
Knorm requires all models to have an `id` field (timestamps are optional). If
your `id` field or timestamp fields have names other than `id`, `createdAt`
and `updatedAt` respectively, you can configure this:
```js
Model.idField = 'uuid';
Model.createdAtField = 'created';
Model.updatedAtField = 'updated';
// In this case your base fields will be something like:
Model.fields = {
  uuid: {
    type: Field.types.uuid,
    required: true,
  },
  created: {
    type: Field.types.dateTime,
    default: () => new Date(),
  },
  updated: {
    type: Field.types.dateTime,
    default: () => new Date(),
  },
};
// You can also override this for any model that extends Model
```
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
    type: Field.types.string,
    required: true,
  },
  confirmed: {
    type: Field.types.string,
    default: false,
  },
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
        references: User.fields.id, // these references are used for joins
    },
    receiverId: {
        type: Field.types.integer,
        references: User.fields.id,
    },
};
```
`User` and `Message` will inherit all the fields of `Model` so you can use this
structure to build more complicated ORMs.

With this setup you'll be able to achieve the following:
```js
const updateUserMessageFlags => async () => {
  const transaction = new Transaction(async transaction => {
    const count = await User.query
      .within(transaction)
      .where({ confirmed: true })
      .count({ field: 'id' }); // or { field: User.fields.id }

    if (count < 1) {
      return;
    }

    const users = await User.query
      .where({ confirmed: true })
      .within(transaction, { forUpdate: true })
      .with([ // this will do a left join from the 'user' to the 'message' table
          Message.query
              .on(Message.fields.senderId)
              .fields([ 'id', Message.fields.text ])
              .as('sentMessages'),
          Message.query
              .on('receiverId')
              .as('receivedMessages'),
      ])
      .fetch();

    console.log(users);

    /*
    will be something like:
    [
      new User({
        id: 1,
        name: 'Foo',
        confirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        sentMessages: [
          new Message({
            id: 1,
            text: 'Hey Bar',
          }),
          new Message({
            id: 2,
            text: 'Hey Bar again',
          }),
        ],
        receivedMessages: [
          new Message({
            id: 3,
            text: 'Hey Foo',
            senderId: 2,
            receiverId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ]
      }),
      new User({
        id: 2,
        name: 'Bar',
        confirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        sentMessages: [
          new Message({
            id: 3,
            text: 'Hey Foo',
          }),
        ]
        receivedMessages: [
          new Message({
            id: 1,
            text: 'Hey Bar',
            senderId: 1,
            receiverId: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          new Message({
            id: 2,
            text: 'Hey Bar again',
            senderId: 1,
            receiverId: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ]
      }),
    ]
    */

    return Promise.all(users.map(user => {
      // Assuming User had 'hasReceivedMessages' and 'hasSentMessages' fields
      // and a sendEmail method
      if (user.receivedMessages.length) {
        user.hasReceivedMessages = true;
      }
      if (user.sentMessages.length) {
        user.hasSentMessages = true;
      }
      return user.save({ transaction })
        .then(user => user.sendEmail());
    }));
  });

  return transaction.execute();
};
```
Knorm is inspired a bit by the [Mongoose](http://mongoosejs.com/) and
[Bookshelf](http://bookshelfjs.org/) APIs.
