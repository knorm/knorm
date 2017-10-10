# Validation

Validation can be configured per field using the field config, for example:

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

## Validators

These validators are supported:

| Validator   | Type     |  Description                                        |
| ----------- | -------- | --------------------------------------------------- |
| `type`      | string   | See [Field.types](api/field.md#fieldtypes) for all the supported field types. |
| `required`  | boolean  | Whether or not a field is required, defaults to `false`. This validator ensures that a field's value is not `undefined` or `null`. |
| `minLength` | integer  | Validates that the field value's `length` is at least as long as this value. Supported only for `string` field types. |
| `maxLength` | integer  | Validates that the field value's `length` is not longer than this value. Supported only for `string` field types. |
| `oneOf`     | array    | Validates that the field value is one of the values in this array. Uses strict equality and case-sensitive matching for strings. |
| `equals`    | mixed    | Validates that the field value is equal to this value. Uses strict equality and case-sensitive matching for strings. |
| `regex`     | RegExp   | Validates that the field value [matches](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test) this regex. |
| `schema`    | object   | See [JSON validation](#json-validation) |
| `validate`  | function | See [custom validation](#custom-validation) |

## Custom validation

To add custom validation, supply a `validate` function to the field config. The
validator is called with the field's value as the only argument and with `this`
set to the instance of the `Model`, so you're able to access other values on the
instance (this is handy for validating fields based on the input of other fields).

Async validators (validators that return a `Promise`) are also supported.
Validation for the field fails if the function:

- throws an error
- returns `false`
- returns a `Promise` that is rejected with an error
- returns a `Promise` that is resolved with `false`

If the validator throws an error or returns a rejected `Promise`, validation for
that field fails with that error (or the rejection error). However, if it returns
`false` or resolves the `Promise` with `false`, then validation fails with a
[ValidationError](api/validation-error.md).

You can also hook into `Field`'s regular validation by returning an object with
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
      // constraint on the column in the database
      const usernameTaken = await User.query.where({ username }).count();
      if (usernameTaken) {
        throw new Error(`The username '${username}' is already taken`);
      }
    }
  }
}
```

!> Custom validators will __not__ be called if the value is `undefined`, but
will be called if the value is `null`.

## JSON validation

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
