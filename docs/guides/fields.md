# Fields

Model fields are synonymous to table columns. To add fields to a model, assign
an object to [Model.fields](api/model.md#modelfields):

```js
class User extends Model {}

User.fields = {
  firstName: fieldConfig,
  lastName: fieldConfig
};
```

You can also use a getter function to return the models fields, but in that case
use `Model.setFields` and `Model.getFields` to ensure
[field inheritance](#field-inheritance):

```js
class User extends Model {
  static get fields {
    this.setFields({
      firstName: fieldConfig,
      lastName: fieldConfig
    });
    return this.getFields();
  }
}
```

Knorm assumes that database column names are the same as field names when
running queries. To transform field names to different column names (e.g.
snake-casing), use a global `fieldToColumn` mapping function (ref.
[Knorm options](api/knorm.md#options)) or specify a different `column` name per
field with the [Field config](#field-config).

## Field config

These config options are currently supported:

| Option   | Type     | Default |  Description                                        |
| ----------- | -------- | -------- | --------------------------------------------------- |
| `type`      | string   | none | See [Field.types](api/field.md#fieldtypes) for all the supported field types. |
| `default`  | mixed / function | none | A default value to use during insert operations if the field has no value. If configured as a function, it will be called with `this` set to the model instance. |
| `column` | string | the field-name | The column-name to use for this field during database operations. __NOTE:__ this takes precedence over the value returned by the `fieldToColumn` mapping function. |
| `primary` | boolean | `false` | Whether or not the field is the primary field. __NOTE:__ a model can only have one primary field, any subsequent primary fields will overwrite the existing one (also in child models). |
| `unique` | boolean | `false` | Whether or not the field is a unique field. Primary and unique fields are used for instance operations i.e. fetch, update, delete etc |
| `methods` | boolean | `false` | If either `primary` or `unique` is `true`, this specifies whether or not to add `fetchByField`, `updateByField` and `deleteByField` static methods to the model. |
| `updated` | boolean | `true` | Whether or not this field should be included in the data to be updated during update operations. Intended for use with unique and primary fields. |
| `references` | Field | none | A field that this field references (indicating that this field is a foreign field). Used for [relations](guides/relations.md#relations). |
| `cast` | Object | none | An object with `forSave` or `forFetch` (or both) functions that are called with the field value to cast it to something else before save (insert and update) and after fetch operations. __NOTE:__ `forSave` cast functions are called before validation. |

> In addition, all [validators](guides/validation.md#validators) are also
> supported

## Primary and unique fields

## Value casting

## Field inheritance

In knorm, a model's fields are cloned and inherited when the model is inherited.
