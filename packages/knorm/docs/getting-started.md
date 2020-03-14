# Getting Started

Knorm is a collection of classes that allow creating JavaScript
[ORM's](https://en.wikipedia.org/wiki/Object-relational_mapping) to make it
easier to work with relational databases.

Knorm can be used on any existing database without requiring any changes to the
database layer. It does not (yet) create or run any database migrations
(creating or altering tables, columns, indexes etc), nor does it generate models
from existing database schema (yet). For creating and running migrations,
consider a library such as [Knex.js](http://knexjs.org).

It can also be used on the browser to create models that do not interact with
the  database, perhaps for data validation. Please note that it's not secure to
generate queries on the browser and send them for processing to a backend
server.

## Installation

```bash
npm install --save @knorm/knorm
```

## Creating models

Start by creating a new instance of an ORM. You may use the factory method or
directly create a new [Knorm](/api.md#knorm) instance:

```js
const knorm = require('@knorm/knorm');
const orm = knorm(/* options */);
// or:
const { Knorm } = require('@knorm/knorm');
const orm = new Knorm(/* options */);
```

> see the [Knorm](/api.md#knorm) docs for more info on Knorm options

The ORM instance created contains [Model](/api.md#model),
[Field](/api.md#field), [Query](/api.md#query) and
[Transaction](/api.md#transaction) classes and the ORM's
configuration. These are kept separate from other ORM instances, making it
possible to have multiple ORMs in a single application, if needed.

With the new ORM, you can directly extend the [Model](/api.md#model) class
to create models:

```js
const knorm = require('@knorm/knorm');
const { Model } = knorm(/* options */);

class User extends Model {}

User.table = 'user';
User.fields = { id: 'integer', names: 'string' };
```

> see the [models guide](/guides/models.md#models) for more on models

## Connecting to the database

At this point the ORM cannot connect to the database yet. To enable that, we
need to install and load an approprite
[plugin](/guides/plugins.md#available-plugins).  This is needed in most cases
but if you only want to use Knorm's classes with no database access (e.g. only
for data validation) you can skip this step.

For example, for postgres, install
[@knorm/postgres](https://github.com/knorm/postgres):

```bash
npm install --save @knorm/postgres
```

Then load it into the ORM:

```js
const knormPostgres = require('@knorm/postgres');
const orm = knorm().use(knormPostgres(/* @knorm/postgres options */));
```

> see the [@knorm/postgres](https://github.com/knorm/postgres) docs
> for info on @knorm/postgres options e.g. database connection options

Now we can use the `User` model to save and retrieve data from the database:

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

> see the [fields guide](/guides/fields.md#fields) for more info on fields

A child model inherits all fields (and virtuals) added to its parent, so `User`
will also have the `id` field. However, fields added to the child model will not
be added to the parent.

> see the [fields guide](/guides/fields.md#field-inheritance) for more info on
> field inheritance

## Adding virtual fields

To add virtual (computed) fields on a model:

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

> see [the virtuals guide](/guides/virtuals.md#virtuals) for more info on
> virtuals
