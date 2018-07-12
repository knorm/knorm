# Transactions

Transactions are supported via the [Transaction](api/transaction.md#transaction) class.

Creating a new transaction exposes a new set of models whose queries will run
inside the transaction:

```js
const knorm = require('knorm');
const { Model, Transaction } = knorm();

class User extends Model {}
User.table = 'user';
User.fields = { id: { type: 'integer', primary: true }, names: 'string' };

User.fetch(); // will not run in a transaction

new Transaction(async transaction => {
  const { User } = transaction.models;
  return User.fetch(); // will run in a transaction
});
```

There are two ways of using transactions:

1. with a callback function
2. without a callback function

## Transactions with a callback

All queries to be run inside the transaction are wrapped in a callback function:

```js
const transaction = new Transaction(async transaction => {
  const { User } = transaction.models;
  await User.insert([{ id: 1, names: 'foo' }, { id: 2, names: 'bar' }]);
  // more queries
  return User.fetch();
});

transaction.execute().then(console.log);
```

Instead of calling [execute](api/transaction.md#transactionprototypeexecute-promise), you can also simply `await` the Transaction instance:

```js
const users = await new Transaction(async transaction => {
  const { User } = transaction.models;
  await User.insert([{ id: 1, names: 'foo' }, { id: 2, names: 'bar' }]);
  // more queries
  return User.fetch();
});
```

> The transaction will be automatically committed if the callback function 
> resolves successfully, otherwise it will be rolled back.

## Transactions without a callback

```js
const transaction = new Transaction();
const { User } = transaction.models;
const insertedUsers = await User.insert([
  { id: 1, names: 'foo' }, 
  { id: 2, names: 'bar' }
]);
// more queries
const fetchedUsers = await User.fetch();
await transaction.commit();
```

!> [commit](api/transaction.md#transactionprototypecommit-promise) must be called
when it's time to commit the transaction.

> If there is any errors running queries, the transaction will be automatically
> rolled back before rejecting the query's promise:

```js
const transaction = new Transaction();
const { User } = transaction.models;
const insertedUsers = await User.insert([
  { id: 1, names: 'foo' }, 
  { id: 2, names: 'bar' }
]);
const moreInsertedUsers = await User.insert([
  { id: 1, names: 'foo' } // cause a duplicate 'id' error
]);
const fetchedUsers = await User.fetch();
await transaction.commit();
```

> the second `User.insert` will be rejected with an 
> [InsertError](api/query.md#queryinserterror) and the transaction will be
> rolled back, such that no rows will end up being inserted.

To ensure transactions are rolled back due to other errors besides query errors,
use a `try..catch` and call [rollback](api/transaction.md#transactionprototyperollback-promise):

```js
const transaction = new Transaction();
const { User } = transaction.models;

try {
  await User.insert([
    { id: 1, names: 'foo' }, 
    { id: 2, names: 'bar' }
  ]);
  // do other things
  await transaction.commit();
} catch (e) {
  await transaction.rollback();
  throw e;
}
```

## Nested queries in instance or class methods

If you have instance methods that run nested queries using other models, access 
those models via [models](api/model.md#modelprototypemodels) (or [the static equivalent](api/model.md#models)) to ensure that those queries are run within
transactions. This is as opposed to `require`ing the model directly.

Assuming:

```js
User.fields = { groupId: 'integer' };

class Group extends Model {
  async getUsers() {
    const { User } = this.models;
    return User.fetch({ where: { groupId: this.id }});
  }
}
Group.table = 'group';
Group.fields = { id: { type: 'integer', primary: true }, name: 'string' };
```

Then if groups are first fetched within a transaction, the users will also be 
fetched within the same transaction:

```js
const group1Users = await new Transaction(async transaction => {
  const { Group } = transaction.models;
  const group = await Group.fetch({ where: { id: 1 }, first: true });
  return group.getUsers();
});
```
