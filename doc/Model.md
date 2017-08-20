# Model

## Model.idField

Knorm expects models to have an `id` field (used mostly in joins). By default it
expects this field to be named 'id' (owing to the fact that knex's
[SchemaBuilder.prototype.increments](http://knexjs.org/#Schema-increments)
creates a column named 'id'). If your id field has a different name, you can
configure it like so:

```js
class Model extends AbstractModel {}

Model.idField = 'email';

// then Model is expected to have a field named 'email'
Model.fields = {
  email: {
    type: 'email', // or type: 'string' if you don't need to validate the emails
    required: true
  },
  // ... other fields
};
```
