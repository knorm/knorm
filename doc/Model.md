# Model

This is the base class that all Knorm models should inherit. It provides the
core functionality for setting and getting a model's data and provides
interfaces to [Field](./Field.md) for data validation and [Query](./Query.md)
for database operations.

<!-- START doctoc -->
<!-- END doctoc -->

*For the following examples, assume this setup:*
```js
const { Model } = require('knorm');
```

## Model.table *(required)*

This is a static field that configures the model's table name:

```js
class User extends Model {}

User.table = 'user';
```

## Model.fields

This is a static field that can be used to configure a model's fields. The value
assigned to `Model.fields` must be an object mapping field names to
[field configs](./Field.md#Field). A field config must contain at least a `type`
option:

```js
User.fields = {
  firstName: {
    type: 'string'
  },
  lastName: {
    type: 'string'
  }
};
```

`User.fields` now contains `firstName` and `lastName` fields.

Fields are inherited when a model is inherited. It's possible to add fields
in a child model without overwriting the parent's fields but if the same field
name is passed in a child model, then it overwrites the parent's field. This
allows specifying a different field config in a child model.

> NOTE: avoid using any of the [Model.reserved](#Model.reserved) fields as
field names.

```js
class Employee extends User {}

Employee.fields = {
  employeeId: {
    type: 'number'
  },
  firstName: {
    type: 'string',
    minLength: 2
  }
};
```

`Employee.fields` now contains `firstName`, `lastName` and `employeeId` fields
while `User.fields` still contains `firstName` and `lastName` fields.
`Employee.fields.firstName` has a `minLength` validation while
`User.fields.firstName` doesn't.

## Model.virtuals

This is a static field that can be used to configure a model's virtual fields.
The value assigned to `Model.virtuals` must be an object mapping virtual field
names to [virtual field configs](./Virtual.md#Virtual). A virtual field config
must contain at least a `get` or a `set` option:

```js
User.virtuals = {
  names: {
    get() {
      return this.firstName + ' ' + this.lastName;
    },
    set(value) {
      const names = value.split(' ');
      this.firstName = names[0];
      this.lastName = names[1];
    }
  }
};
```

Note that async getters (getters that return a promise) are supported. That
allows getters that do database calls, cache data etc. Async setters are however
not supported.

Virtuals also behave like regular fields in that they are also inherited when a
model is inherited, can be added to or overwriten much like `Model.fields`.

When an instance of the model is created, getters and setters for the virtual
fields are automatically added to the instance. These are used in
[Model.prototype.setData](#Model.prototype.setData) and
[Model.prototype.getData](#Model.prototype.getData).

> NOTE: avoid using any of the [Model.reserved](#Model.reserved) fields or
[Model.fields](#Model.fields) as virtual field names.

> Also, avoid using arrow functions for getters and setters if you wish to
access the instance using `this`.

## Model.idField

Knorm expects models to have an `id` field (used for instance in SQL joins). By
default it expects this field to be named `'id'` (owing to the fact that knex's
[SchemaBuilder.prototype.increments](http://knexjs.org/#Schema-increments)
creates a column named `'id'`). If your `id` field has a different name, you can
configure it using `Model.idField`:

```js
class Image extends Model {}

Image.idField = 'uuid';

// then Image is expected to have a field named 'uuid'
Image.fields = {
  uuid: {
    type: Field.types.uuid,
    required: true
  }
};
```

## Model.createdAtField / Model.updatedAtField

Knorm doesn't require models to have an `createdAt` and `updatedAt` fields but
will do the right thing if they do exist (for instance,
[`Query.prototype.update`](#Query.prototype.update) populates the `updatedAt`
field if it has a default value set). By
default, knorm expects these fields to be named `'createdAt'` and `'updatedAt'`
(owing to the fact that knex's
[SchemaBuilder.prototype.timestamps](http://knexjs.org/#Schema-timestamps)
creates columns named `'created_at'` and `updated_at`). If your timestamp fields
have different names, you can configure them using `Model.createdAtField` and
`Model.updatedAtField`. However, only resort to this if you can't map column
names to field names using
[Field.prototype.getColumnName](./Field.md#Field.prototype.getColumnName).

```js
Image.createdAtField = 'created';
Image.updatedAtField = 'updated';

Image.fields = {
  created: {
    type: Field.types.dateTime,
    default: () => new Date()
  },
  updated: {
    type: Field.types.dateTime,
    default: () => new Date()
  }
};
```

## Model(data = {})

Creates an instance of a model and optionally accepts an object data to assign
the instance. If a `data` object is provided, it's passed to
[Model.prototype.setData](#Model.prototype.setData).


```js
const user = new User();
```

## Model.prototype.setData({}) : Model

This sets an instance's data, accepting an object with key/value pairs mapping
field names (or virtual field names) to values. All the keys in it must be valid
field or virtual field names.

```js
// correct:
user.setData({ firstName: 'foo', lastName: 'bar' });
user.setData({ names: 'foo bar' });

// wrong:
user.setData({ foo: 'bar' }); // this throws an error
```

You can however add other arbitrary data to the instance:

```js
user.foo = 'bar';
user.firstName = 'fooo';
```

In this case the field names will not be validated against the list of
configured field or virtual field names.
