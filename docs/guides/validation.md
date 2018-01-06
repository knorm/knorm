# Validation

Validation is configured per field using the field config:

```js
class User extends Model {}

User.fields = {
  firstName: {
    type: 'string',
    required: true,
    minLength: 2
  }
};
```

> `type`, `required` and `minLength` are validation rules

A model instance is validated before
[insert](api/model.md#modelprototypeinsertoptions-promise-gt-model) and
[update](api/model.md#modelprototypeupdateoptions-promise-gt-model). Before inserts,
all fields will be validated (**_except the `id` field if it's `undefined`_**)
whereas before updates, only the fields that have values set will be validated.

> You can trigger validation any time on a model instance via
> [Model.prototype.validate](api/model.md#modelprototypevalidateoptions-promise-gt-modelvalidationerror)

## Validators

These validators are supported:

| Validator   | Type     | Description                                                                                                                                                                             |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`      | string   | See [Field.types](api/field.md#fieldtypes) for all the supported field types.                                                                                                           |
| `required`  | boolean  | Whether or not a field is required, defaults to `false`. This validator ensures that a field's value is not `undefined` or `null`.                                                      |
| `minLength` | integer  | Validates that the field value's `length` is at least as long as this value. Supported only for `string`, `text` and `jsonArray` (for [JSON validation](#json-validation)) field types. |
| `maxLength` | integer  | Validates that the field value's `length` is not longer than this value. Supported only for `string`, `text` and `jsonArray` (for [JSON validation](#json-validation)) field types.     |
| `oneOf`     | array    | Validates that the field value is one of the values in this array. Uses strict equality and case-sensitive matching for strings.                                                        |
| `equals`    | mixed    | Validates that the field value is equal to this value. Uses strict equality and case-sensitive matching for strings.                                                                    |
| `regex`     | RegExp   | Validates that the field value [matches](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test) this regex.                                      |
| `validate`  | function | See [custom validation](#custom-validation)                                                                                                                                             |
| `schema`    | object   | See [JSON validation](#json-validation)                                                                                                                                                 |

## Custom validation

To add custom validation, supply a `validate` function to the field config. The
validator is called with the field's value as the only argument and with `this`
set to the instance of the `Model`, so you're able to access other values on the
instance (this is handy for validating fields based on the input of other fields).

Async validators (validators that return a `Promise`) are also supported.
Validation for the field fails if the function:

* throws an error
* returns `false`
* returns a `Promise` that is rejected with an error
* returns a `Promise` that is resolved with `false`

If the validator throws an error or returns a rejected `Promise`, validation for
that field fails with that error (or the rejection error). However, if it returns
`false` or resolves the `Promise` with `false`, then validation fails with a
[ValidationError](api/validation-error.md).

You can also continue validating by returning an object with the regular
[validators](#validators) (or resolving the `Promise` with an object with
validators), including another custom validator function!

```js
class User extends Model {}

User.fields = {
  loginType: {
    type: 'string',
    required: true,
    oneOf: ['email', 'oauth']
  },
  email: {
    type: 'string',
    validate(value) {
      if (this.loginType === 'email') {
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
      // NOTE: this is just an example, it's better to do this with a UNIQUE
      // constraint on the column
      const usernameTaken = await User.count({ where: { username } });
      if (usernameTaken) {
        throw new Error(`The username '${username}' is already taken`);
      }
    }
  }
};
```

!> Custom validators will **not** be called if the value is `undefined`, but
will be called if the value is `null`

## JSON validation

For [json](http://knexjs.org/#Schema-json) (and
[jsonb](http://knexjs.org/#Schema-jsonb)) fields, you can have the JSON values
validate by adding a `schema` object to the field definition object.

!> JSON fields are **only** validated if they contain a `schema` validator

```js
class Upload extends Model {}

Upload.fields = {
  image: {
    type: 'jsonb',
    schema: {
      filename: { type: 'string' },
      mimetype: { type: 'string', oneOf: ['image/jpeg', 'image/png'] },
      data: { type: 'binary', required: true }
    }
  }
};
```

With this schema, these are valid:

```js
new Upload({
  image: { filename: 'foo', mimetype: 'image/jpeg', data: Buffer.from('foo') }
});
// Upload.fields.image is not a required field:
new Upload({});
// filename is not required:
new Upload({ image: { mimetype: 'image/jpeg', data: Buffer.from('foo') } });
```

while these are invalid:

```js
// mimetype 'image/gif' is not allowed:
new Upload({
  image: { filename: 'foo', mimetype: 'image/gif', data: Buffer.from('foo') }
});
// filename should be a string:
new Upload({
  image: { filename: 1, mimetype: 'image/png', data: Buffer.from('foo') }
});
```

> JSON `schema` validators support all the [validators](#validators), including
> nested `schema` validators [for nested objects](#nested-objects)

### JSON arrays

For JSON arrays, use the custom `jsonArray` field type. You can also define the
schema of a single item by passing a `schema` validation object with the regular
[validators](#validators).

```js
class SomeData extends Model {}

SomeData.fields = {
  data: {
    type: 'json',
    schema: {
      currentVersion: {
        type: 'string',
        required: true
      },
      oldVersions: {
        type: 'jsonArray',
        maxLength: 2,
        schema: {
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

For nested objects, use the custom `jsonObject` type. You can also define the
nested object's schema with a nested `schema` validator.

```js
class SomeData extends Model {}

SomeData.fields = {
  data: {
    type: 'json',
    schema: {
      nested: {
        type: 'jsonObject',
        schema: {
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

!> Nested object fields **must** contain a `type`, just like
[Field](#api/field.md#field) instances

### Root-level JSON fields

For JSON fields whose values are not nested in an object, define their
validators with a `schema` validator:

```js
class SomeData extends Model {}
SomeData.fields = {
  value: {
    type: 'json',
    schema: {
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
    type: 'jsonArray',
    schema: {
      required: true,
      type: 'string'
    }
  }
};
const rootLevelArray = new RootLevelArray({ value: ['some value'] });
```

## Overriding validators

In Postgres, for example, `string` types have a max-length of `255`. Instead of
adding a `maxLength` validator for every field of type `string`, you could
override the `string` validator to add max-length validation for every `string`
field:

```js
const { Field: KnormField } = require('knorm');

class Field extends KnormField {
  validateIsString(value, type) {
    super.validateIsString(value, type);
    this.validateMaxLengthIs(value, 255);
  }
}
```
