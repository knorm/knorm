# Validation

Validation can be configured per field using the field config, for example:

```js
Model.fields = {
  firstName: {
    type: 'string',
    required: true,
    minLength: 2
  }
};
```

## Validators

These validators are supported:

| Validator   | Type     |  Description                                        |
| ----------- | -------- | --------------------------------------------------- |
| `type`      | string   | See [Field.types](api/field.md#fieldtypes) for all the supported field types. |
| `required`  | boolean  | Whether or not a field is required, defaults to `false` |
| `minLength` | integer  | Validates that the field value's `length` is at least as long as this value. Supported only for `string` field types. |
| `maxLength` | integer  | Validates that the field value's `length` is not longer than this value. Supported only for `string` field types. |
| `oneOf`     | array    | Validates that the field value is one of the values in this array. Uses strict equality and case-sensitive matching for strings. |
| `equals`    | mixed    | Validates that the field value is equal to this value. Uses strict equality and case-sensitive matching for strings. |
| `regex`     | RegExp   | Validates that the field value [matches](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test) this regex. |
| `schema`    | object   | See [JSON validation](#json-validation) |
| `validate`  | function | See [custom validation](#custom-validation) |


## Custom validation

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
