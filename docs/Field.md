## Overriding validators

In Postgres, for example, `string` types have a max-length of `255`. Instead of
adding a `maxLength` validator for every field of type `string`, you could
override the `string` validator to add max-length validation:

```js
const { Field: AbstractField } = require('knex-orm');

class Field extends AbstractField {
  validateIsString(value) {
    super.validateIsString(value);
    this.validateMaxLengthIs(value, 255);
  }
}

module.exports = Field;
```
