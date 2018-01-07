# Models

Models are synonymous to database tables. They provide the core functionality
for setting, validating, saving, updating and deleting data. All models should
inherit the base [Model](api/model.md#model) class.

## Model config

Models are configured via static properties:

| Property         | Type                        | Description                                                                                                                                                                           |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Model.table`    | string (**required**)       | Configures the model's table-name. **NOTE:** even though this is required, you can still have models that don't have a `table` property if they don't perform any database operations |
| `Model.fields`   | object                      | See the [fields guide](guides/fields.md#fields) for more info                                                                                                                         |
| `Model.virtuals` | object                      | See the [virtuals guide](guides/virtuals.md#virtuals) for more info                                                                                                                   |
| `Model.Query`    | [Query](api/query.md#query) | The `Query` class that the model uses to perform database operations. This allows [customizing queries](#customizing-queries) per model.                                              |
| `Model.Field`    | [Field](api/field.md#field) | The `Field` class that the model uses to create field instances. Also allows customizing fields per model.                                                                            |

> see the [Model](api/model.md#model) docs for Model API documentation

## Customizing queries

For example, if your users table has some system users that should not be
fetched/updated/deleted, you can override `User.Query` and add default filters:

```js
class User extends Model {}

User.fields = {
  id: { type: 'integer', primary: true },
  type: { type: 'string', default: 'user', oneOf: ['system', 'user'] }
};

User.Query = class UserQuery extends User.Query {
  constructor(...args) {
    super(...args);
    this.whereNot({ type: 'system' });
  }
};

User.fetch().then(console.log); // will not contain system users
```
