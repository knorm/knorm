# Model

This is the base class that all Knorm models should inherit. It provides the
core functionality for setting and getting a model's data and provides
interfaces to [Field](api/field.md) for data validation and [Query](api/query.md)
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

## Model.primary

Knorm expects models to have a primary field. Configure your model's primary
field using the `primary` Field config:

```js
class Image extends Model {}

Image.fields = {
  uuid: { type: 'uuid', primary: true }
};
```

You can override the primary field in a child class when defining the fields for
that model:

```js
class OtherImage extends Image {}

OtherImage.fields = {
  otherUuid: { type: 'uuidV4', primary: true }
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
## Model.prototype.setDefaults([options]) : Model
## Model.prototype.validate([options]) : Promise => Model/ValidationError
## Model.prototype.cast([options]) : Model
## Model.prototype.fetch([options]) : Promise => Model
## Model.prototype.save([options]) : Promise => Model
## Model.prototype.insert([options]) : Promise => Model
## Model.prototype.update([options]) : Promise => Model
## Model.prototype.delete([options]) : Promise => Model
## Model.count([options]) : Promise => Number
## Model.fetch([options]) : Promise => [Model]
## Model.save(data, [options]) : Promise => [Model]
## Model.insert(data, [options]) : Promise => [Model]
## Model.update(data, [options]) : Promise => [Model]
## Model.delete([options]) : Promise => [Model]
## Model.fetchById(id, [options])
## Model.updateById(id, data, [options])
## Model.deleteById(id, [options])
