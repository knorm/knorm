# Model

This is the base class that all models should inherit.

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

## Model.prototype.getFieldData([options]) : Object

## Model.prototype.getVirtualData([options]) : Promise => Object

## Model.prototype.getVirtualDataSync([options]) : Object

## Model.prototype.getData([options]) : Promise => Object

## Model.prototype.getDataSync([options]) : Object

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
