---
title: Usage
---

## Installation

Install the core package via npm:

```bash
npm install --save @knorm/knorm
```

Or yarn:

```bash
yarn add @knorm/knorm
```

### Creating an ORM

<!-- TODO: add link to Knorm class -->
<!-- TODO: add link to Model class -->
An ORM is an instance of the Knorm class. It encapsulates a group of Model
classes and configurations used by the instance. For instance, one ORM could
contain `User` and `Group` models that interface to one PostgreSQL database,
while another contains an `LogEvent` model that interfaces to a different
database on the same PostgreSQL server or even to a MySQL database.

There are two ways of creating an ORM. You may use the factory method:

```js
const { knorm } = require('@knorm/knorm');
const orm = knorm(/* options */);
```

<!-- TODO: add link to Knorm class -->
Or create a new Knorm instance:

```js
const { Knorm } = require('@knorm/knorm');
const orm = new Knorm(/* options */);
```

<!-- TODO: add link to Knorm class -->
> see the API docs for more info on Knorm options

### Creating models

<!-- TODO: add link to Model class -->
<!-- TODO: add link to Transaction class -->
The ORM instance created contains Model and Transaction classes and the ORM's
configuration. These are kept isolated from other ORM instances which makes it
possible to have multiple ORMs in a single application.

<!-- TODO: add link to Model class -->
With the new ORM, one can extend the Model class to create and configure new
models:

<!-- TODO: update shape of Model.fields -->
```js
const { knorm } = require('@knorm/knorm');
const orm = knorm();
const { Model } = orm;

class User extends Model {}

User.table = 'user';
User.fields = { id: 'integer', names: 'string' };
```

> see the [models guide](docs/guides/models.md) for more on models

### Connecting to the database

<!-- TODO: update shape of Model.fields -->
At this point the ORM cannot connect to the database yet. To enable that, we
need to install and load an approprite plugin.

:::note
If you wish to use Knorm's classes with no database access (e.g. only for data validation) you can skip this part.
:::

<!-- TODO: add link to @knorm/postgres -->
For example, to connect to PostgreSQL, install @knorm/postgres:

```bash
npm install --save @knorm/postgres
```

Then load it into the ORM:

```js
const { knorm } = require('@knorm/knorm');
const { knormPostgres } = require('@knorm/postgres');
const orm = knorm()
  .use(knormPostgres({
    connection: 'postgres://user:password@host/database-name'
  }));
```

<!-- TODO: add link to @knorm/postgres docs -->
> see the @knorm/postgres docs for more info on configuration options

Now we can use the `User` model to save and retrieve data from the database:

```js
const doWork = async () => {
  const user = await new User({ id: 1, names: 'Foo Bar' }).insert();
  console.log(user); // => User({ id: 1, names: 'Foo Bar' })

  const users = await User.fetch();
  console.log(users); // => [ User({ id: 1, names: 'Foo Bar' }) ]
};
```

## Configuration

<!-- TODO: improve the configuration docs  -->
So far, we've already seen some configuration options:

<!-- TODO: update plugin configuration options (to Model.options) -->
- A `connection` config option for the @knorm/postgres factory function
- `User.table` and `User.fields` config options for the `User` model

<!-- TODO: add link to Model class -->
The ORM is configured entirely via the Model classes. Note that, since the Model
classes all extend the base Model class, these configurations are inherited by
all models. There are two types of configurations:

### ORM configuration

<!-- TODO: add link to Knorm class -->
These are configurations that apply to the entire Knorm instance; for instance,
database-connection options. These configurations can be set via the plugin
constructors or on a Model (**recommended**):

<!-- TODO: verify the ORM configuration section  -->
```js
Model.options = {
  plugins: {
    '@knorm/postgres': {
      // @knorm/postgres options
    }
  }
};
```

### Model configuration

<!-- TODO: add link to Model class -->
These are configurations that apply to a single Model; for instance, the table
and field (or column) names.

Both of these can be inherited, therefore, a `Student` class that extends `User`
would store and retrieve data from the `user` table on the PostgreSQL database
configured.

This enables some nice features:

### Configuring common fields

In some cases, there will be fields that are common to all models. To avoid
having to add the same fields to each model, one could create a base
`Model` class with the shared fields and then have all other models extend it.

For example, if all models have an "id" field that is the primary field:

```js
const { knorm } = require('@knorm/knorm');
const { knormPostgres } = require('@knorm/postgres');
const orm = knorm()
  .use(knormPostgres({
    connection: 'postgres://user:password@host/database-name'
  }));

class Model extends orm.Model {}

// add the common "id" field:
Model.fields = {
  id: { type: 'integer', primary: true, updated: false, methods: true }
};

class User extends Model {}

// add only the fields specific to User:
User.fields = { names: 'string' };
```

<!-- TODO: add link to fields guide -->
> see the fields' guide for more info
