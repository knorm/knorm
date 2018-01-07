# Fields

Model fields are synonymous to table columns. To add fields to a model, assign
an object to [Model.fields](api/model.md#modelfields):

```js
class User extends Model {}
User.fields = { fieldName: fieldConfig };
```

You can also use a getter function to return the models fields, but first add
the fields to the model's config to ensure they are linked to the model and that
[field inheritance](#field-inheritance) is maintained:

```js
class User extends Model {
  static get fields {
    this.config.fields = { fieldName: fieldConfig };
    return this.config.fields;
  }
}
```

Knorm uses field names as column names when running queries. To transform field
names to different column names (e.g. snake-casing), use a `fieldToColumn`
mapping function (ref. [Knorm options](api/knorm.md#options)) or specify a
different `column` name per field with the [field config](#field-config).

## Field config

These config options are supported:

| Option       | Type                  | Default        | Description                                                                                                                                                                                                                                               |
| ------------ | --------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`       | string (**required**) | none           | See [field types](#field-types).                                                                                                                                                                                                                          |
| `default`    | any / function        | none           | A default value to use during insert operations if the field has no value. If configured as a function, it will be called with `this` set to the model instance.                                                                                          |
| `column`     | string                | the field name | The column name to use for this field during database operations. **NOTE:** this takes precedence over the value returned by the `fieldToColumn` mapping function.                                                                                        |
| `primary`    | boolean               | `false`        | Whether or not the field is the primary field. **NOTE:** a model can only have one primary field, any subsequent primary fields will overwrite the existing one (also in child models).                                                                   |
| `unique`     | boolean               | `false`        | Whether or not the field is a unique field. Primary and unique fields are used for instance operations i.e. fetch, update, delete etc                                                                                                                     |
| `methods`    | boolean               | `false`        | If either `primary` or `unique` is `true`, this specifies whether or not to add `fetchByField`, `updateByField` and `deleteByField` static methods to the model.                                                                                          |
| `updated`    | boolean               | `true`         | Whether or not this field should be included in the data to be updated during update operations. Intended for use with unique and primary fields.                                                                                                         |
| `references` | Field                 | none           | A field that this field references (indicating that this field is a foreign field). Used for [relations](guides/relations.md#relations).                                                                                                                  |
| `cast`       | Object                | none           | An object with `forSave` or `forFetch` (or both) functions that are called with the field value to cast it to something else before save (insert and update) and after fetch operations. **NOTE:** `forSave` cast functions are called before validation. |

> In addition, [validators](guides/validation.md#validators) are also
> supported as field config options

## Field types

These field types are supported:

| Type         | Description                                                                           |
| ------------ | ------------------------------------------------------------------------------------- |
| `text`       | Knex's [text](http://knexjs.org/#Schema-text) schema type                             |
| `json`       | Knex's [json](http://knexjs.org/#Schema-json) schema type                             |
| `jsonb`      | Knex's [jsonb](http://knexjs.org/#Schema-jsonb) schema type                           |
| `uuid`       | Knex's [uuid](http://knexjs.org/#Schema-uuid) schema type                             |
| `uuid4`      | Similar to the `uuid` type but must be a valid V4 UUID                                |
| `binary`     | Knex's [binary](http://knexjs.org/#Schema-binary) schema type                         |
| `decimal`    | Knex's [decimal](http://knexjs.org/#Schema-decimal) schema type                       |
| `string`     | Knex's [string](http://knexjs.org/#Schema-string) schema type                         |
| `boolean`    | Knex's [boolean](http://knexjs.org/#Schema-boolean) schema type                       |
| `integer`    | Knex's [integer](http://knexjs.org/#Schema-integer) schema type                       |
| `dateTime`   | Knex's [dateTime](http://knexjs.org/#Schema-dateTime) schema type                     |
| `date`       | Knex's [date](http://knexjs.org/#Schema-date) schema type                             |
| `email`      | Similar to the `string` type but must be a valid email address                        |
| `number`     | Includes integers and decimal values                                                  |
| `any`        | Any value (useful in [JSON validation](guides/validation.md#json-validation))         |
| `jsonObject` | Objects i.e. `{}` (useful in [JSON validation](guides/validation.md#json-validation)) |
| `jsonArray`  | Arrays i.e. `[]` (useful in [JSON validation](guides/validation.md#json-validation))  |

## Field inheritance

In knorm, a model's fields are cloned and inherited when the model is inherited.

## Primary and unique fields

## Value casting
