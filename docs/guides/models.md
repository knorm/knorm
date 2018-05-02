# Models

Models are synonymous to database tables. They provide the core functionality
for setting, validating, saving, updating and deleting data. All models should
inherit the base [Model](api/model.md#model) class.

## Model config

Models are configured via static properties:

| Property         | Type                        | Default                     | Description                                                                                                                                                                           |
| ---------------- | --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Model.table`    | string (**required**)       | none                        | Configures the model's table-name. **NOTE:** even though this is required, you can still have models that don't have a `table` property if they don't perform any database operations |
| `Model.fields`   | object                      | none                        | Configures the model's fields. See the [fields guide](guides/fields.md#fields) for more info                                                                                          |
| `Model.virtuals` | object                      | none                        | Configures the model's virtual fields. See the [virtuals guide](guides/virtuals.md#virtuals) for more info                                                                            |
| `Model.Query`    | [Query](api/query.md#query) | [Query](api/query.md#query) | The `Query` class that the model uses to perform database operations. This allows [customizing queries](#customizing-queries) per model.                                              |
| `Model.Field`    | [Field](api/field.md#field) | [Field](api/field.md#field) | The `Field` class that the model uses to create field instances. Also allows customizing fields per model.                                                                            |

> See the [Model](api/model.md#model) docs for Model API documentation

## Setting data

Assuming this model:

```js
class User extends Model {}

User.fields = { firstName: { type: 'string' }, lastName: { type: 'string' } };

User.virtuals = {
  names: {
    get() {
      return `${this.firstName} ${this.lastName}`;
    },
    set(names) {
      names = names.split(' ');
      this.firstName = names[0];
      this.lastName = names[1];
    }
  }
};
```

You can set data on the model instance in any of the following ways:

```js
// constructor:
const user = new User({ firstName: 'Foo', lastName: 'Bar' });

// setData:
const user = new User().setData({ firstName: 'Foo', lastName: 'Bar' });

// assignment:
const user = new User();
user.firstName = 'Foo';
user.lastName = 'Bar';
```

Setting data via virtuals is also supported:

```js
// constructor:
const user = new User({ names: 'Foo Bar' });

// setData:
const user = new User().setData({ names: 'Foo Bar' });

// assignment:
const user = new User();
user.names = 'Foo Bar';
```

> See the [Model](api/model.md#model) docs for more info

## Getting data

Following the example in [Setting data](#setting-data), you can get data set on
the instance via:

```js
// direct property access:
console.log(user.firstName); // => 'Foo'
console.log(user.lastName); // => 'Bar'
console.log(user.names); // => 'Foo Bar'

// or:
user.getFieldData(); // { firstName: 'Foo', lastName: 'Bar' }
user.getVirtualDataSync(); // { names: 'Foo Bar' }
user.getDataSync(); // { firstName: 'Foo', lastName: 'Bar', names: 'Foo Bar' }

// with async virtuals:
user.getVirtualData(); // Promise => { names: 'Foo Bar' }
user.getData(); // Promise => { firstName: 'Foo', lastName: 'Bar', names: 'Foo Bar' }
```

!> Since `async` virtual getters are intrinsically supported, the methods that
get virtual field data always return a `Promise`. However, you can stil use the
sync variants to ignore async virtual data.

## Manipulating database data

For all [Model](api/model.md#model) instances, you can save, retrieve or delete
data in the database with these methods:

```js
// either insert or update (if the instance has a primary field-value set):
user.save(options);

// or directly call:
user.insert(options);
user.update(options);

// fetch or re-fetch:
user.fetch(options);

// delete:
user.delete(options);
```

> All the methods return a `Promise`

> See the [Query](api/query.md#query) docs for supported options

All the methods update the instance with the latest data from the database, so
after an update you do not need to re-fetch for example (this can be disabled
with the `returning` option though).

The [update](api/model.md#modelprototypeupdateoptions-promise-gt-model),
[fetch](api/model.md#modelprototypefetchoptions-promise-gt-model) and
[delete](api/model.md#modelprototypedeleteoptions-promise-gt-model) methods
require a primary or unique field to be set on the model in order to find the
row in the database. See the
[primary and unique fields guide](guides/field.md#primary-and-unique-fields) for
more info.

All the methods also have static variants that instead enable manipulating
multiple records:

```js
// insert multiple records:
User.save([user1, user2], options);
User.insert([user1, user2], options);

// update multiple records:
User.update({ firstName: 'Bar' }, options);

// fetch all records:
User.fetch(options);

// delete all records:
User.delete(options);
```

> All the methods return a `Promise`

!> A significant difference between the instance and static methods is that the
instance methods will throw an error if the record is not found in the database
(for fetch, delete and update operations).

In addition, you can configure various "ByField" methods for primary and unique
fields with the `methods` [field config option](guides/fields.md#field-config):

```js
User.fields = { email: { type: 'email', unique: true, methods: true } };

User.fetchByEmail('foo@bar.com', options);
User.updateByEmail('foo@bar.com', data, options);
User.deleteByEmail('foo@bar.com', options);
```

!> These methods also throw an error if the record is not found in the database
since they are intended to work with single records.

## Customizing queries

For example, if your users table has some system users that should not be
fetched/updated/deleted, you can override `User.Query` and add default filters:

```js
class User extends Model {}

User.fields = {
  id: { type: 'integer', primary: true },
  type: { type: 'string', default: 'user', oneOf: ['system', 'user'] }
};

User.Query = class UserQuery extends User.Query {
  constructor(...args) {
    super(...args);
    this.whereNot({ type: 'system' });
  }
};

User.fetch().then(console.log); // will not contain system users
```
