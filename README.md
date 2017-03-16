# knorm

[![build status](https://gitlab.one.com/jmu/knorm/badges/master/build.svg)](https://gitlab.one.com/jmu/knorm/commits/master)
[![coverage report](https://gitlab.one.com/jmu/knorm/badges/master/coverage.svg)](https://gitlab.one.com/jmu/knorm/commits/master)

ORM for [Knex.js](http://knexjs.org/) with built-in support for joins.

```js
const updateUsers => async () => {
  new Transaction(async transaction => {
    const count = await User.query
      .transaction(transaction)
      .where({ confirmed: true })
      .count({ field: 'id' });

    if (count < 1) {
      return;
    }

    const users = await User.query
      .where({ id: 1 })
      .require()
      .with([
        Image.query
          .as('publicImage')
          .on('userId')
          .fields('id')
          .where({ public: true }),
        Image.query
          .as('privateImage')
          .on(Image.fields.userId)
          .fields(Image.fields.id)
          .where({ public: false }),
        ])
      .transaction(transaction, { forUpdate: true })
      .fetch();

    users.forEach(user => {
      if (user.publicImage) {
        user.hasPublicImage = true;
      }
      if (user.privateImage) {
        user.hasPrivateImage = true;
      }
    });

    return User.query
      .transaction(transaction)
      .require()
      .save(users);
  });
}
```
