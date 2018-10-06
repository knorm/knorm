# Transactions

Transactions are supported via the [Transaction](/api.md#transaction) class.

Creating a new transaction creates a new set of models whose queries will be run
inside the transaction:

```js
const knorm = require('@knorm/knorm');
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
  // ... more queries
  return User.fetch();
});

transaction.execute().then(console.log);
```

Instead of calling [transaction.execute](/api.md#transaction-execute-promise),
you can also simply `await` the `Transaction` instance:

```js
const users = await new Transaction(async transaction => {
  const { User } = transaction.models;
  await User.insert([{ id: 1, names: 'foo' }, { id: 2, names: 'bar' }]);
  // ... more queries
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
// ... more queries
const fetchedUsers = await User.fetch();
await transaction.commit();
```

::: warning NOTE
[transaction.commit](/api.md#transaction-commit-promise) **must** be called when
it's time to commit the transaction.
:::

::: tip INFO
If there is any error while running a query, the transaction will be
automatically rolled back before the query that failed is rejected:
:::

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
> [InsertError](/api.md#query-inserterror-insert-error) and the transaction will
> be rolled back, such that no rows will end up being inserted.

To ensure transactions are rolled back due to other errors besides query errors,
use a `try..catch` (or `Promise.prototype.catch`) and call
[transaction.rollback](/api.md#transaction-rollback-promise) if an error occurs:

```js
const transaction = new Transaction();
const { User } = transaction.models;

try {
  await User.insert([
    { id: 1, names: 'foo' },
    { id: 2, names: 'bar' }
  ]);
  // ... do other things, that may throw an error
  await transaction.commit();
} catch (e) {
  await transaction.rollback();
  throw e;
}
```

## Running queries inside other methods within transactions

If you have instance methods that run nested queries using other models, access
those models via [model.models](/api.md#model-models-models) (or
[Model.models](/api/model.md#models-models-object-2) in static methods) to
ensure that those queries are run within transactions.

::: tip INFO
In transactions, the model regstry is replaced with a new set of models whose
queries run inside a transaction. Therefore, the same code inside those methods
will not require any changes for the queries to run inside transactions.
:::

For example, with this setup:

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

To get a group's users, you would do something like:

```js
const group1 = await Group.fetch({ where: { id: 1 }, first: true });
const group1Users = await group1.getUsers();
```

In this case, the queries are sent normally, i.e. not within a transaction. To
run the same queries within a transaction:

```js
const group1Users = await new Transaction(async transaction => {
  const { Group } = transaction.models;
  const group = await Group.fetch({ where: { id: 1 }, first: true });
  return group.getUsers();
});
```

Without having to change the implementation of `Group.prototype.getUsers` at
all.

For this reason, when using models in instance and static methods, it's
recommended to always access models via the [model
registry](/guides/models.md#model-registry) instead of requiring them with
Node's `require` method.
