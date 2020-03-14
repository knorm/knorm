refactor: refactor Model and Field

feat(Field): add FieldError

feat(Model): add ModelError

fix(Model): fix generated methods to work with non-primary and non-unique
fields. Fixes https://github.com/knorm/knorm/issues/247.

BREAKING CHANGE: Removed `Virtual`. Virtual fields can be added
via `Model.fields` instead:

```js
class User extends Model {}

User.fields = {
  fullName: {
    type: 'virtual',
    getValue(model) {
      // return the value from the Model instance
    },
    setValue(model, value) {
      // set the value on the Model instance
    }
  }
}
```

BREAKING CHANGE: `Model.prototoype.getData` no longer returns a promise that
resolves with the `Model` instances' data, it now returns the data itself.
This is due to removing internal support for `async` getters for virtual
fields. Async getters may still be used, but the promises will have to be
awaited by the consuming code:

```js
class User extends Model {}

User.fields = {
  fullName: {
    type: 'virtual',
    async getValue(model) {
      return 'Foo Bar';
    }
  }
};

const user = new User();

user.fullName; // => Promise
user.fullName.then(console.log) // => 'Foo Bar'
user.getData().fullName // => Promise
user.getData().fullName.then(console.log) // => 'Foo Bar'
```

Due to this change, the following obsolete methods were also removed:

- `Model.prototoype.getFieldData`: Non-virtual field data can be accessed via
  `Model.prototype.$values` instead.
- `Model.prototoype.getVirtualData`
- `Model.prototoype._getVirtualData`
- `Model.prototoype._getVirtualGetters`
- `Model.prototoype._isPromise`
- `Model.prototoype.getVirtualDataSync`
- `Model.prototoype.getDataSync`

Additionally, getters and setters for all fields are now added to the `Model`
instance. This allows the ORM to more easily track updates to field values but
prepares for similar features to be added in future, such as diffing between
old and new field values.

BREAKING CHANGE: The `Field` constructor now accepts the `Model` class as the
first parameter and the config object as the second parameter.

BREAKING CHANGE: Removed `Field.prototype.getDefault`. Functionality moved to
`Model.prototoype.setDefaults` instead.
