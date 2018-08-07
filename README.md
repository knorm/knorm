# @knorm/relations

[![npm version](https://badge.fury.io/js/%40knorm%2Frelations.svg)](https://badge.fury.io/js/%40knorm%2Frelations)
[![build status](https://travis-ci.org/knorm/relations.svg?branch=master)](https://travis-ci.org/knorm/relations)
[![coverage status](https://coveralls.io/repos/github/knorm/relations/badge.svg?branch=master)](https://coveralls.io/github/knorm/relations?branch=master)
[![dependency status](https://david-dm.org/knorm/relations.svg)](https://david-dm.org/joelmukuthu/@knorm/relations)
[![Greenkeeper badge](https://badges.greenkeeper.io/knorm/relations.svg)](https://greenkeeper.io/)

Relations plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm).

## Installation

```bash
npm install --save @knorm/knorm @knorm/relations
```

> @knorm/relations has a peer dependency on [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)

## Usage

```js
const knorm = require('@knorm/knorm');
const knormRelations = require('@knorm/relations');

const orm = knorm({
  /* knorm options */
}).use(
  knormRelations({
    /* knormRelations options */
  })
);
```

## Options

| Option | Type   | Default     | Description                                                                                   |
| ------ | ------ | ----------- | --------------------------------------------------------------------------------------------- |
| `name` | string | `relations` | The name of the plugin. Allows accessing the plugin instance via `orm.plugins['plugin-name']` |

## Usage

Loading this plugin adds the following methods to the
[Query](https://knorm.github.io/knorm/#/api/query) class:

* `Query.prototype.join` - fetches a related model via a `JOIN` statement
* `Query.prototype.innerJoin` - synonymn for `Query.prototype.join`
* `Query.prototype.leftoin` - fetches a related model via a `LEFT JOIN` statement
* `Query.prototype.on` - specifies which field to join on
* `Query.prototype.as` - specifies what alias to use for the related model

Which enables using them as [query options](https://knorm.github.io/knorm/#/guides/queries?id=setting-options).

## One-to-one and one-to-many relations

Similar to adding a foreign key in SQL, one-to-many relations are defined by
adding a reference from one field to another:

```js
const knorm = require('@knorm/knorm');
const knormPostgres = require('@knorm/postgres'); // to connect to postgres
const knormRelations = require('@knorm/relations');

const { Model } = knorm()
  .use(knormPostgres())
  .use(knormRelations());

class User extends Model {}

User.table = 'user';
User.fields = { id: 'integer', names: 'string' };

class Message extends Model {}

Message.table = 'message';
Message.fields = {
  text: {
    type: 'text',
    required: true
  },
  read: {
    type: 'boolean',
    default: false
  },
  senderId: {
    type: 'integer',
    references: User.fields.id // reference
  },
  receiverId: {
    type: 'integer',
    references: User.fields.id // reference
  }
};

User.insert([{ id: 1, names: 'User 1' }, { id: 2, names: 'User 2' }]);
Message.insert({ id: 1, senderId: 1, receiverId: 2, text: 'Hi User 2!' });
```

Then to fetch related models:

```js
const usersWithReceivedMessagesCount = await User.query
  .innerJoin(Message.query.on('receiverId'))
  .fetch();

const usersWithUnreadMessages = await User.query
  .leftJoin(
    Message.query
      .on('receiverId')
      .as('receivedMessages')
      .where({ read: false })
  )
  .fetch();

// you can also pass query options using an object:
const usersWithUnreadMessages = await User.query
  .leftJoin(Message, {
    on: 'receiverId',
    as: 'receivedMessages',
    where: { read: false }
  })
  .fetch();
```

> if `as` is not specified, it defaults to a camelCase representation of the
> name of model being joined

`usersWithUnreadMessages` will be something like:

```js
[
  new User({
    id: 1,
    name: 'User 1',
    receivedMessages: null
  }),
  new User({
    id: 2,
    name: 'User 2',
    receivedMessages: [
      new Message({
        id: 1,
        senderId: 1,
        receiverId: 2,
        text: 'Hi User 2!'
      })
    ]
  })
];
```

> if `on` is not specified, the join will be done on ALL the fields that have
> references to each other for the two models:

```js
// joins on both senderId and receiverId
const usersWithBothReceivedAndSentMessagesCount = await User.query
  .innerJoin(Message)
  .fetch();
```

## Many-to-many relations

To create a many-to-many relation, create a model for the many-to-many relational
table in your database:

```js
class Friendship extends Model {}

Friendship.table = 'friendship';
Friendship.fields = {
  userId: {
    type: 'integer',
    references: User.fields.id
  },
  friendId: {
    type: 'integer',
    references: User.fields.id
  }
};
```

To fetch friend data:

```js
const usersWithFriendsCount = await User.query
  .innerJoin(Friendship.query.on('userId'))
  .count();

const usersWithFriends = await User.query
  .leftJoin(
    Friendship.query
      .on('userId')
      .leftJoin(User.query.on('friendId').as('friend'))
  )
  .fetch();
```

`usersWithFriends` will be something like:

```js
[
  new User({
    id: 1,
    name: 'User 1',
    friendship: [
      new Friendship({
        id: 1,
        userId: 1,
        friendId: 2,
        friend: [
          new User({
            id: 2,
            name: 'User 2'
          })
        ]
      })
    ]
  }),
  new User({
    id: 2,
    name: 'User 2',
    friendship: [
      new Friendship({
        id: 2,
        userId: 2,
        friendId: 1,
        friend: [
          new User({
            id: 1,
            name: 'User 1'
          })
        ]
      })
    ]
  })
];
```
