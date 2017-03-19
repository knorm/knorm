# knorm

[![build status](https://gitlab.one.com/jmu/knorm/badges/master/build.svg)](https://gitlab.one.com/jmu/knorm/commits/master)
[![coverage report](https://gitlab.one.com/jmu/knorm/badges/master/coverage.svg)](https://gitlab.one.com/jmu/knorm/commits/master)

A purely class-based ORM for [Knex.js](http://knexjs.org/) with built-in support
for joins.

```js
const updateUsers => async () => {
  const transaction = new Transaction(async transaction => {
    const count = await User.query
      .transaction(transaction)
      .where({ confirmed: true })
      .count({ field: 'id' }); // or { field: User.fields.id }

    if (count < 1) {
      return;
    }

    const users = await User.query
      .where({ hasPublicImage: null })
      .orWhere({ hasPrivateImage: null })
      .with([
        Image.query
          .as('publicImage')
          .fields('id') // or .fields(User.fields.id) or .fields(['id'])
          .where({ public: true }),
        Image.query
          .as('privateImage')
          .fields(Image.fields.id)
          .where({ public: false }),
      ])
      .transaction(transaction, { forUpdate: true })
      .fetch();

    return Promise.all(users.map(user => {
      if (user.publicImage) {
        user.hasPublicImage = true;
      }
      if (user.privateImage) {
        user.hasPrivateImage = true;
      }
      return user.save({ transaction });
    }));
  });

  return transaction.execute();
};
```
