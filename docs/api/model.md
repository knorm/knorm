# Model

This is the base class that all Knorm models should inherit. It provides the
core functionality for setting and getting a model's data and provides
interfaces to [Field](./field.md) for data validation and [Query](./query.md)
for database operations.

> The examples on this page extend the setup in the
[getting started guide](guides/getting-started.md)

## Model.table *(required)*

This is a static field that configures the model's table name:

```js
class User extends Model {}

User.table = 'user';
```

## Model.fields

This is a static field that can be used to configure a model's fields. The value
assigned to `Model.fields` must be an object mapping field names to
[field configs](./field.md). A field config must contain at least a `type`
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
> `User.fields` now contains `firstName` and `lastName` fields.

Fields are inherited when a model is inherited. It's possible to add fields
in a child model without overwriting the parent's fields but if the same field
name is passed in a child model, then it overwrites the parent's field. This
allows specifying a different field config in a child model.

!> this setter will throw if you try to add a field whose name is already a
`Model.prototype` property, or is added as a [virtual](#modelvirtuals) already.

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
> `Employee.fields` now contains `firstName`, `lastName` and `employeeId` fields
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

Async getters (getters that return a `Promise`) are supported. That allows
getters that do database calls, cache data etc. Async setters are however
__not__ supported.

Virtuals also behave like regular fields in that they are also inherited when a
model is inherited, can be added to or overwriten much like
[Model.fields](#modelfields).

When an instance of the model is created, getters and setters for the virtual
fields are automatically added to the instance. These are used in
[Model.prototype.setData](#modelprototypesetdatadata-model) and
[Model.prototype.getData](#modelprototypegetdataoptions-object).

!> this setter will throw if you try to add a field whose name is already
a `Model.prototype` property, or is added as a [field](#modelfields) already.

> Also, avoid using arrow functions for getters and setters if you wish to
access the instance using `this`.

## Model.fieldNames

Knorm expects models to have an `id` field. By default it expects this field to
be named `'id'` (owing to the fact that knex's
[SchemaBuilder.prototype.increments](http://knexjs.org/#Schema-increments)
creates a column named `'id'`). If your `id` field has a different name, you can
configure it using `Model.fieldNames`:

```js
class Image extends Model {}

Image.fieldNames = {
  id: 'uuid'
};

// then Image is expected to have a field named 'uuid'
Image.fields = {
  uuid: {
    type: 'uuid',
    required: true
  }
};
```

## Model.Query

## Model.Field

## Model([data])

Creates an instance of a model and optionally accepts an object data to assign
the instance. If a `data` object is provided, it's passed to
[Model.prototype.setData](#modelprototypesetdatadata-model).


```js
const user = new User();
```

## Model.prototype.setData(data) : Model

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

## Model.prototype.getData([options]) : Object
## Model.prototype.setDefaults([options])
## Model.prototype.validate([options])
## Model.prototype.cast([options])
## Model.prototype.fetch([options])
## Model.prototype.save([options])
## Model.prototype.insert([options])
## Model.prototype.update([options])
## Model.prototype.delete([options])
## Model.count([options])
## Model.fetch([options])
## Model.save(data, [options])
## Model.insert(data, [options])
## Model.update(data, [options])
## Model.delete([options])
## Model.fetchById(id, [options])
## Model.updateById(id, data, [options])
## Model.deleteById(id, [options])
