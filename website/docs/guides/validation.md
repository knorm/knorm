---
title: Validation
---

Validation is configured per field using the
[field config](./fields.md#field-config).

A model instance is validated before
`Model.prototype.insert` and `Model.prototype.update`. Before inserts, all
fields will be validated (**_except the primary field if it's `undefined`_**)
whereas before updates, only the fields that have values set will be validated.

You can trigger validation any time on a model instance via
`Model.prototype.validate`.

:::tip info
Validation can be configured for each field via the [field
configs](./fields.md#field-config).
:::

## Regex validation

You can validate fields against regular expressions by either

* configuring a regular expression that all values must match
* configuring a regular expression that all values must not match
* both matching and non-matching regular expressions

The regular expressions are [tested](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test)
against the field's value.

### Matching regex

Can be configured directly via the `regex` field config:

```js {6}
class User extends Model {}

User.fields = {
  username: {
    type: 'string',
    regex: /[a-z]/
  }
};
```

Or explicitly via an object with a `matching` regex:

```js {7}
class User extends Model {}

User.fields = {
  username: {
    type: 'string',
    regex: {
      matching: /[a-z]/
    }
  }
};
```

Both these configs will ensure that values for `username` will be lowercase a-z
letters:

```js
new User({ username: 'foo' }); // valid
new User({ username: 'foo1' }); // not valid
```

### Non-matching regex

Can be configured via an object with a `notMatching` regex:

```js {7}
class User extends Model {}

User.fields = {
  username: {
    type: 'string',
    regex: {
      notMatching: /\./
    }
  }
};
```

This ensures that values for `username` will not contain a dot (.):

```js
new User({ username: 'foo' }); // valid
new User({ username: 'foo1' }); // valid
new User({ username: 'foo.' }); // not valid
```

### Both matching and non-matching regex

Can be configured via an object with both `matching` and `notMatching` regex's:

```js {7,8}
class User extends Model {}

User.fields = {
  username: {
    type: 'string',
    regex: {
      matching: /[a-z]/,
      notMatching: /\./
    }
  }
};
```

This ensures that values for `username` will be lowercase a-z letters and will
not contain a dot (.):

```js
new User({ username: 'foo' }); // valid
new User({ username: 'foo1' }); // not valid
new User({ username: 'foo.' }); // not valid
```

## Custom validation

To add custom validation, supply a `validate` function to the field config. The
validator is called with the field's value and the `Model` instance as
parameters, so you're able to access other values on the instance. This is handy
for validating fields based on the input of other fields.

Async validators (validators that return a `Promise`) are also supported.
Validation for the field fails if the function:

* throws an error
* returns `false`
* returns a `Promise` that is rejected with an error
* returns a `Promise` that is resolved with `false`

If the validator throws an error or returns a rejected `Promise`, validation for
that field fails with that error (or the rejection error). However, if it returns
`false` or resolves the `Promise` with `false`, then validation fails with a
`Field.ValidationError`.

You can also continue validating by returning an object with the regular
[validators](./fields.md#field-config) (or resolving the `Promise` with an
object with validators), including another custom validator function!

```js {11,12,13,14,15,16,17,18,19,24,25,26,27,28,29,30}
class User extends Model {}

User.fields = {
  loginType: {
    type: 'string',
    required: true,
    oneOf: ['email', 'oauth']
  },
  email: {
    type: 'string',
    validate(value, model) {
      if (model.loginType === 'email') {
        // return new validators
        return {
          required: true,
          regex: /some-regex-for-validating-emails/
        };
      }
    }
  },
  username: {
    type: 'string',
    required: true,
    async validate(username) {
      // NOTE: this is just an example, it's better to do this with a UNIQUE constraint
      const usernameTaken = await User.count({ where: { username } });
      if (usernameTaken) {
        throw new Error(`The username '${username}' is already taken`);
      }
    }
  }
};
```

:::tip info
Custom validators will **not** be called if the value is `undefined`, but will
be called if the value is `null`.
:::

## JSON validation

For [json](http://knexjs.org/#Schema-json) (and
[jsonb](http://knexjs.org/#Schema-jsonb)) fields, you can have the JSON values
validated by adding a `shape` object to the field definition object.

```js {6,7,8,9,10}
class Upload extends Model {}

Upload.fields = {
  image: {
    type: 'jsonb',
    shape: {
      filename: { type: 'string' },
      mimetype: { type: 'string', oneOf: ['image/jpeg', 'image/png'] },
      data: { type: 'binary', required: true }
    }
  }
};
```

With this config, these are valid:

```js
new Upload({
  image: { filename: 'foo', mimetype: 'image/jpeg', data: Buffer.from('foo') }
});
// Upload.fields.image is not a required field:
new Upload({});
// Upload.fields.image.filename is not required:
new Upload({ image: { mimetype: 'image/jpeg', data: Buffer.from('foo') } });
```

while these are invalid:

```js
// Upload.fields.image.mimetype 'image/gif' is not allowed:
new Upload({
  image: { filename: 'foo', mimetype: 'image/gif', data: Buffer.from('foo') }
});
// Upload.fields.image.filename should be a string:
new Upload({
  image: { filename: 1, mimetype: 'image/png', data: Buffer.from('foo') }
});
```

:::tip info
JSON `shape` validators support all the
[validators](./fields.md#field-config), including nested `shape`
validators [for nested objects](#nested-objects).
:::

:::tip info
You may also define the shape with the `fieldName: fieldType` shorthand:
:::

```js {7,8}
class User extends Model {}

User.fields = {
  data: {
    type: 'jsonb',
    shape: {
      firstName: 'string',
      lastName: 'string'
    }
  }
};
```

### JSON arrays

For JSON arrays, use the `array` field type. You can also define the shape of a
single array item by passing a `shape` validation object with the regular
[validators](./fields.md#field-config).

```js {12,14,15,16,17}
class SomeData extends Model {}

SomeData.fields = {
  data: {
    type: 'json',
    shape: {
      currentVersion: {
        type: 'string',
        required: true
      },
      oldVersions: {
        type: 'array',
        maxLength: 2,
        shape: {
          type: 'string',
          required: true
        }
      }
    }
  }
};

const someData = new SomeData({
  data: {
    currentVersion: 'v1.0.0',
    oldVersions: ['v0.9.0', 'v0.8.0']
  }
});
```

### Nested objects

For nested objects, use the `object` field type. You can also define the nested
object's shape with a nested `shape` validator.

```js {8,9,10,11,12}
class SomeData extends Model {}

SomeData.fields = {
  data: {
    type: 'json',
    shape: {
      nested: {
        type: 'object',
        shape: {
          someField: { type: 'string' },
          someOtherField: { type: 'number' }
        }
      }
    }
  }
};

const someData = new SomeData({
  data: {
    nested: {
      someField: 'some value',
      someOtherField: 1
    }
  }
});
```

:::important note
Nested object fields **should** contain a `type`, just like regular `Field` instances.
:::

### Root-level JSON fields

For JSON fields whose values are not nested in an object, define their
validators with a `shape` validator:

```js {5,6,7,8,9,18,19,20,21}
class SomeData extends Model {}
SomeData.fields = {
  value: {
    type: 'json',
    shape: {
      type: 'string',
      required: true,
      maxLength: 255
    }
  }
};
const someData = new SomeData({ value: 'some value' });

class RootLevelArray extends Model {}
RootLevelArray.fields = {
  value: {
    type: 'array',
    shape: {
      required: true,
      type: 'string'
    }
  }
};
const rootLevelArray = new RootLevelArray({ value: ['some value'] });
```

Note that you may also define the shape with the `fieldName: fieldType`
shorthand:

```js {6}
class User extends Model {}

User.fields = {
  data: {
    type: 'jsonb',
    shape: 'string'
  }
};
```

## Overriding validators

Instead of repeating the same validation config for multiple related fieds, you
could instead overload a validator.

For example, to enforce a max-length of `500` for all `string` field types,
instead of adding a `maxLength` validator for every field of type `string`, you
could override the `string` validator to add max-length validation for every
`string` field.

This can be easily done with a [plugin](./plugins.md):

```js
const stringsMaxLength500 = orm => {
  class StringsMaxLength500 extends orm.Field {
    validateIsString(value, type) {
      super.validateIsString(value, type);
      this.validateMaxLengthIs(value, 500);
    }
  }

  orm.Model.Field = orm.Field = StringsMaxLength500;
};
```
