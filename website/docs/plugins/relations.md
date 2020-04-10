---
title: '@knorm/relations'
---

Relations plugin for Knorm.

## Installation

```bash
npm install --save @knorm/knorm @knorm/relations
```

> @knorm/relations has a peer dependency on @knorm/knorm

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

### Options

| Option | Type     | Default     | Description                                                                                                          |
| ------ | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| [name] | `string` | `relations` | The name of the plugin, allows accessing the plugin instance via Knorm's plugin registry (`Knorm.prototype.plugins`) |

## Features

Loading this plugin adds the following methods to the `Query` class:

- `Query.prototype.join` - fetches a related model via a `JOIN` statement
- `Query.prototype.innerJoin` - fetches a related model via an `INNER JOIN`
  statement
- `Query.prototype.leftoin` - fetches a related model via a `LEFT JOIN`
  statement
- `Query.prototype.on` - specifies which field to join on
- `Query.prototype.as` - specifies what alias to use for the related model in
  the returned data

Which enables using them as [Query
options](/guides/queries.md?id=setting-options).

### One-to-many relations

Similar to adding a foreign key in SQL, one-to-many relations are defined by
adding a reference from one field to another:

```js
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
```

Once references are defined, joins can then be configured when fetching data:

```js
User.insert([{ id: 1, names: 'User 1' }, { id: 2, names: 'User 2' }]);
Message.insert({ id: 1, senderId: 1, receiverId: 2, text: 'Hi User 2!' });

const usersWithReceivedMessages = await User.query
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

// result:
// [
//   new User({
//     id: 1,
//     name: 'User 1',
//     receivedMessages: []
//   }),
//   new User({
//     id: 2,
//     name: 'User 2',
//     receivedMessages: [
//       new Message({
//         id: 1,
//         senderId: 1,
//         receiverId: 2,
//         text: 'Hi User 2!'
//       })
//     ]
//   })
// ];
```

Query options can also be passed via an object:

```js
const usersWithUnreadMessages = await User.query
  .leftJoin(Message, {
    on: 'receiverId',
    as: 'receivedMessages',
    where: { read: false }
  })
  .fetch();
```

:::tip info
If `as` is not specified, it defaults to a camelCase representation of the name
of model being joined.
:::

:::important note
If `on` is not specified, the join will be done on ALL the fields that have
references to each other for the two models:
:::

```js
// joins on both `senderId` and `receiverId`
const usersWithBothReceivedAndSentMessages = await User.query
  .innerJoin(Message)
  .fetch();
```

### One-to-one relations

These are similar to one-to-many joins, but you can configure the join to only
return the first row via the `Query.prototype.first` Query option:

```js
const usersWithAReceivedMessage = await User.query
  .innerJoin(Message.query.on('senderId'))
  .fetch();

// result:
// [
//   new User({
//     id: 1,
//     name: 'User 1',
//     message: null
//   }),
//   new User({
//     id: 2,
//     name: 'User 2',
//     message: new Message({
//       id: 1,
//       senderId: 1,
//       receiverId: 2,
//       text: 'Hi User 2!'
//     })
//   })
// ];
```

### Many-to-many relations

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

// result:
// [
//   new User({
//     id: 1,
//     name: 'User 1',
//     friendship: [
//       new Friendship({
//         id: 1,
//         userId: 1,
//         friendId: 2,
//         friend: [
//           new User({
//             id: 2,
//             name: 'User 2'
//           })
//         ]
//       })
//     ]
//   }),
//   new User({
//     id: 2,
//     name: 'User 2',
//     friendship: [
//       new Friendship({
//         id: 2,
//         userId: 2,
//         friendId: 1,
//         friend: [
//           new User({
//             id: 1,
//             name: 'User 1'
//           })
//         ]
//       })
//     ]
//   })
// ];
```
