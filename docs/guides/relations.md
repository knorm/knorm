# Relations

Relations in knorm are supported via `LEFT JOIN` and `INNER JOIN` statements.

## One-to-one and one-to-many relations

Similar to adding a foreign key in SQL, one-to-many relations are defined by
adding a reference from one field to another:

```js
class Message extends Model {}

Message.table = 'message';
Message.fields = {
  text: {
    type: 'text',
    required: true
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

Then to fetch data via a join:

```js
(async function() {
  const usersWithReceivedMessagesCount = await User.query
    .innerJoin(Message.query.on('receiverId')) // or .join()
    .count();

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

  // console.log(usersWithUnreadMessages) will be something like:
  // [
  //   new User({
  //     id: 1,
  //     name: 'User 1',
  //     receivedMessages: [
  //       new Message({
  //         id: 1,
  //         senderId: 2,
  //         receiverId: 1,
  //         text: 'Hi User 1! Best, User 2.'
  //       })
  //     ]
  //   }),
  //   new User({
  //     id: 2,
  //     name: 'User 2'
  //   })
  // ]

  const usersWithBothReceivedAndSentMessagesCount = await User.query
    .innerJoin(Message)
    .count();

  // without adding an `on` option, the join will be done on ALL the fields
  // that have references to each other for the two models
})();
```

## Many-to-many relations

To create a many-to-many relation, create a model for the many-to-many relational
table in your database:

```js
class UserFriend extends Model {}

UserFriend.table = 'user_friend';
UserFriend.fields = {
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
(async function() {
  const usersWithFriendsCount = await User.query
    .innerJoin(UserFriend.query.on('userId'))
    .count();

  const usersWithFriends = await User.query
    .leftJoin(
      UserFriend.query
        .on('userId')
        .leftJoin(User.query.on('friendId').as('friend'))
    )
    .fetch();

  // console.log(usersWithFriends) will be something like:
  // [
  //   new User({
  //     id: 1,
  //     name: 'User 1',
  //     userFriend: [
  //       new UserFriend({
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
  //     userFriend: [
  //       new UserFriend({
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
  // ]
})();
```
