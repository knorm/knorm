# Getting started

## Creating an ORM

Install Knorm:

```bash
npm install --save @knorm/knorm
```

Then create a new ORM:

```js
const knorm = require('@knorm/knorm');
const { Model } = knorm(/* options */);

class User extends Model {}
```

> see the [Knorm docs](api/knorm.md#knorm) for info on Knorm options

> the `knorm` factory returns an ORM instance with [Model](api/model.md#model),
[Field](api/field.md#field), [Query](api/query.md#query) and
[Transaction](api/transaction.md#transaction)

## Enabling database access

At this point our ORM cannot connect to the database yet. To enable that, we need
to install and load an approprite [plugin](guides/plugins.md#available-plugins).

This is needed in most cases but if you only want to use Knorm's classes with no
database access (e.g. only for data validation) you can skip this step.

For example, for postgres, install
[@knorm/postgres](https://www.npmjs.com/package/@knorm/postgres):

```bash
npm install --save @knorm/postgres
```

Then load it into the ORM:

```js
const knormPostgres = require('@knorm/postgres');
const orm = knorm().use(knormPostgres(/* @knorm/postgres options */));
```

> see the [@knorm/postgres](https://www.npmjs.com/package/@knorm/postgres) docs
> for info on @knorm/postgres options e.g. database connection options

Now we can use our `User` model to manipulate data, we just need to configure
its table-name and fields:

```js
const { Model } = orm;

class User extends Model {}

User.table = 'user';
User.fields = { id: 'integer', names: 'string' };
```

With this setup you can now manipulate data:

```js
const user = await new User({ id: 1, names: 'Foo Bar' }).insert();
console.log(user); // => User({ id: 1, names: 'Foo Bar' })

const users = await User.fetch();
console.log(users); // => [ User({ id: 1, names: 'Foo Bar' }) ]
```

## Adding common fields

In most cases, you'll have fields that are common to all your models. To avoid
having to add the same fields to each model you create, you can create a base
`Model` class, add the common fields there and then have your models extend that
class.

For example, to if all your models have an "id" field that is the primary field:

```js
const orm = knorm().use(knormPostgres());

class Model extends orm.Model {}

// add the common "id" field:
Model.fields = {
  id: { type: 'integer', primary: true, updated: false, methods: true }
};

class User extends Model {}

// add only the fields specific to User:
User.fields = { names: 'string' };
```

> See [the fields guide](guides/fields.md#fields) for more info on fields

A child model inherits all fields (and virtuals) added to its parent, so `User`
will also have the `id` field. However, fields added to the child model will not
be added to the parent.

> See [the Model docs](api/model.md) for more info on
> [field inheritance](api/model.md#modelfields) and [virtuals inheritance](api/model.md#modelvirtuals).

## Adding virtual fields

To add virtual or computed fields on a model:

```js
User.virtuals = {
  initials() {
    return this.names
      ? this.names
          .split(' ')
          .map(name => name[0])
          .join('')
      : undefined;
  }
};

const user  = new User({ names: 'Foo Bar' });

console.log(user.initials); // => 'FB'
```

> See [the virtuals guide](guides/virtuals.md#virtuals) for more info on virtuals
