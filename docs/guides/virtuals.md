# Virtuals

Virtuals are computed fields. To add virtuals to a model, assign an object to
[Model.virtuals](api/model.md#modelvirtuals):

```js
class User extends Model {}
User.virtuals = { virtualName: virtualConfig };
```

You can also use a getter function to return the model's virtuals, but first add
the virtuals to the model's config to ensure they are linked to the model and
that [inheritance](guides/fields.md#field-inheritance) is maintained:

```js
class User extends Model {
  static get virtuals {
    this.config.virtuals = { virtualName: virtualConfig };
    return this.config.virtuals;
  }
}
```

When an instance of the model is created, getters and setters for the virtual
fields are automatically added to the instance. In addition, they are also used
in [setting](guides/models.md#setting-data) and
[getting](guides/models.md#getting-data) model data.

!> Virtual names should be unique. The `Model.virtuals` setter will throw if the
virtual's name is already a `Model.prototype` property or is already defined as
a [field](guides/fields.md#fields).

## Virtual config

A virtual field's config can either be a function or an object. If a function,
it's assumed to the virtual's `get` function.

As an object, the virtual config object is similar to an accessor descriptor for
[Object.defineProperty](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty):

| Option | Type     | Description                                                                                                                                      |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get`  | function | A function that returns the virtual's value. It will be called with `this` set to the model instance. **NOTE:** `async` functions are supported. |
| `set`  | function | A function that sets the virtual's value. It will be called with `this` set to the model instance.                                               |

!> Both `get` and `set` are optional, but at least one should be configured

> Beware of using arrow functions for `get` and `set` as they lose the `this`
> context
