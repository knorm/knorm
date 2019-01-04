## Classes

<dl>
<dt><a href="#Connection">Connection</a></dt>
<dd><p>Defines how to connect to the database and run queries e.g. via plugins.</p>
</dd>
<dt><a href="#Field">Field</a></dt>
<dd><p>Creates and holds configuration for fields, e.g. how to validate or cast
fields.</p>
</dd>
<dt><a href="#Knorm">Knorm</a></dt>
<dd><p>Creates and configures ORMs.</p>
</dd>
<dt><a href="#Model">Model</a></dt>
<dd><p>Creates model instances and allows setting, getting, validating and casting
data before and/or after database operations.</p>
</dd>
<dt><a href="#Query">Query</a></dt>
<dd><p>Creates and runs queries and parses any data returned.</p>
</dd>
<dt><a href="#Transaction">Transaction</a></dt>
<dd><p>Creates and executes transactions, allowing multiple queries to be run within
a transaction.</p>
</dd>
</dl>

<a name="Connection"></a>

## Connection
Defines how to connect to the database and run queries e.g. via plugins.


* [Connection](#Connection)
    * _instance_
        * [.knorm](#Connection+knorm) : [Knorm](#Knorm)
        * [.create()](#Connection+create)
        * [.query(sql)](#Connection+query)
        * [.close()](#Connection+close)
    * _static_
        * [.ConnectionError](#Connection.ConnectionError)
        * [.knorm](#Connection.knorm) : [Knorm](#Knorm)

<a name="Connection+knorm"></a>

### connection.knorm : [Knorm](#Knorm)
A reference to the [Knorm](#Knorm) instance.

::: tip
This is the same instance assigned to the [knorm](#Connection.knorm) static
property, just added as a convenience for use in instance methods.
:::

<a name="Connection+create"></a>

### connection.create()
Called by [connect](#Query+connect) and [connect](#Transaction+connect) to connect
to the database (or acquire clients from a connection pool).

**Throws**:

- `ConnectionError` If the method is not implemented.

<a name="Connection+query"></a>

### connection.query(sql)

| Param | Type | Description |
| --- | --- | --- |
| sql | `string` \| `object` | The SQL to query. |
| sql.text | `string` | The parameterized SQL string (with placeholders), when `sql` is passed as an object. |
| sql.values | `array` | The values for the parameterized SQL string, when `sql` is passed as an object. |

Called by [execute](#Query+execute), [_begin](#Transaction+_begin),
[_commit](#Transaction+_commit) and [_rollback](#Transaction+_rollback) to execute a
query with the connection created by [create](#Connection+create).

**Throws**:

- `ConnectionError` If the method is not implemented.

<a name="Connection+close"></a>

### connection.close()
Called by [close](#Query+close) and [close](#Transaction+close) to close the
connection created by [create](#Connection+create).

**Throws**:

- `ConnectionError` If the method is not implemented.

<a name="Connection.ConnectionError"></a>

### Connection.ConnectionError
The base error that all errors thrown by [Connection](#Connection) inherit from.

<a name="Connection.knorm"></a>

### Connection.knorm : [Knorm](#Knorm)
A reference to the [Knorm](#Knorm) instance.

::: tip
This is the same instance assigned to the [knorm](#Connection+knorm) instance
property, just added as a convenience for use in static methods.
:::

<a name="Field"></a>

## Field
Creates and holds configuration for fields, e.g. how to validate or cast
fields.


* [Field](#Field)
    * [new Field([config])](#new_Field_new)
    * _instance_
        * [.validateWithCustom(value, validate, modelInstance)](#Field+validateWithCustom) ⇒ `Promise`
    * _inner_
        * [~customValidator](#Field..customValidator) ⇒ `Promise` \| `boolean` \| `object`

<a name="new_Field_new"></a>

### new Field([config])

| Param | Type | Description |
| --- | --- | --- |
| [config] | `object` | The field's configuration. |

Creates a [Field](#Field) instance.

<a name="Field+validateWithCustom"></a>

### field.validateWithCustom(value, validate, modelInstance) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| value | `any` | The value to validate |
| validate | [customValidator](#Field..customValidator) | The validator function. |
| modelInstance | [Model](#Model) | The [Model](#Model) instance where the field value is set, if one exists. This will always be set if this method is called via [Model#validate](Model#validate). |

Validates a value with a custom validator function.

**Todo**

- [ ] **breaking change** in the validator function, do not set `this` to
the model instance. Instead, `this` should point to the [Field](#Field)
instance.

<a name="Field..customValidator"></a>

### Field~customValidator ⇒ `Promise` \| `boolean` \| `object`

| Param | Type | Description |
| --- | --- | --- |
| value | `any` | the value to validate. |
| The | [Model](#Model) | [Model](#Model) instance where the field value is set, if one exists. This will always be set if [validateWithCustom](#Field+validateWithCustom) is called via [Model#validate](Model#validate). |

Custom validator function, note that `async` validator functions, or
functions that return a [Promise](Promise), are supported.

Validation for the value will be failed if the function:
  - throws an error
  - returns `false`
  - returns a `Promise` that is rejected with an error
  - returns a `Promise` that is resolved with `false`

This function may also return an object with the regular
[validators](/guides/fields.md#field-config), or resolving the `Promise`
with an object with validators, including another custom validator
function!

<a name="Knorm"></a>

## Knorm
Creates and configures ORMs.


* [Knorm](#Knorm)
    * [new Knorm([config])](#new_Knorm_new)
    * _instance_
        * [.Model](#Knorm+Model) : [Model](#Model)
        * [.Connection](#Knorm+Connection) : [Connection](#Connection)
        * [.Query](#Knorm+Query) : [Query](#Query)
        * [.Transaction](#Knorm+Transaction) : [Transaction](#Transaction)
        * [.Field](#Knorm+Field) : [Field](#Field)
        * [.use(plugin)](#Knorm+use) ⇒ [Knorm](#Knorm)
        * [.addModel(model)](#Knorm+addModel)
        * [.clone()](#Knorm+clone) ⇒ [Knorm](#Knorm)
        * [.updateField(Field)](#Knorm+updateField) ⇒ [Knorm](#Knorm)
    * _static_
        * [.KnormError](#Knorm.KnormError) : `KnormError`

<a name="new_Knorm_new"></a>

### new Knorm([config])

| Param | Type | Description |
| --- | --- | --- |
| [config] | `object` | The ORM's configuration. |
| config.fieldToColumn | `function` | A function to convert all field-names  to column names, for example [snakeCase](https://lodash.com/docs/4.17.10#snakeCase). |
| config.debug | `boolean` | Whether or not to enable debug mode. See [the debugging guide](/guides/debugging) for more info. |

Creates a new [Knorm](#Knorm) (ORM) instance. Each instance has it's own set
of classes and configuration, which enables having multiple [Knorm](#Knorm)
instances in a single application.

<a name="Knorm+Model"></a>

### knorm.Model : [Model](#Model)
The [Knorm](#Knorm) instance's [Model](#Model) class.

<a name="Knorm+Connection"></a>

### knorm.Connection : [Connection](#Connection)
The [Knorm](#Knorm) instance's [Connection](#Connection) class.

<a name="Knorm+Query"></a>

### knorm.Query : [Query](#Query)
The [Knorm](#Knorm) instance's [Query](#Query) class.

<a name="Knorm+Transaction"></a>

### knorm.Transaction : [Transaction](#Transaction)
The [Knorm](#Knorm) instance's [Transaction](#Transaction) class.

<a name="Knorm+Field"></a>

### knorm.Field : [Field](#Field)
The [Knorm](#Knorm) instance's [Field](#Field) class.

<a name="Knorm+use"></a>

### knorm.use(plugin) ⇒ [Knorm](#Knorm)

| Param | Type | Description |
| --- | --- | --- |
| plugin | `object` \| `function` | The plugin to load. If passed as a function,  the function is called with the ORM instance for initialisation. Note that if an object is passed, it should have `name` and `init` properties. |
| plugin.name | `string` | The name of the plugin. This allows later accessing the plugin via the ORM's `plugins` object. Note that for functions, the plugin's `name` is the function's name. |
| plugin.init | `function` | The function called to initialise the plugin. |

Loads a plugin into the ORM.

**Returns**: [Knorm](#Knorm) - the ORM instance.  
**Throws**:

- `KnormError` if the plugin provided is not a function or is an
object without an `init` method.
- `KnormError` if the plugin has no `name` property.
- `KnormError` if the plugin has already been added.

<a name="Knorm+addModel"></a>

### knorm.addModel(model)

| Param | Type | Description |
| --- | --- | --- |
| model | [Model](#Model) | The model to add to the ORM. Note that models are automatically added to a [Knorm](#Knorm) instance when they are configured, therefore you will only need to call this method to add models that are not configured. See [/guides/models.html#model-registry](/guides/models.html#model-registry) for more info. |

Adds a model to a [Knorm](#Knorm) instance.

**Throws**:

- `KnormError` if the model passed does not inherit the ORM's
[Model](#Model) instance. This prevents one from (perhaps accidentally)
adding a model from ORM instance X to ORM instance Y.
- `KnormError` if the model has already been added.

**Todo**

- [ ] return the [Knorm](#Knorm) instance.

<a name="Knorm+clone"></a>

### knorm.clone() ⇒ [Knorm](#Knorm)
Creates a clone of an existing [Knorm](#Knorm) instance, copying all the
models and plugins loaded into the original orm.

**Returns**: [Knorm](#Knorm) - the newly cloned ORM instance.  
<a name="Knorm+updateField"></a>

### knorm.updateField(Field) ⇒ [Knorm](#Knorm)

| Param | Type | Description |
| --- | --- | --- |
| Field | [Field](#Field) | The new class. This could be a class that extends the current [Field](#Knorm+Field) class or an entirely new class. |

Updates the [Field](#Field) class used in the [Knorm](#Knorm) instance. This
ensures all references to the new class are updated accordingly.

**Returns**: [Knorm](#Knorm) - The same [Knorm](#Knorm) instance to allow chaining.  
<a name="Knorm.KnormError"></a>

### Knorm.KnormError : `KnormError`
A reference to [KnormError](KnormError).

<a name="Model"></a>

## Model
Creates model instances and allows setting, getting, validating and casting
data before and/or after database operations.


* [Model](#Model)
    * [new Model([data])](#new_Model_new)
    * _instance_
        * [.knorm](#Model+knorm) : [Knorm](#Knorm)
        * [.models](#Model+models) : `object`
        * [.transaction](#Model+transaction) : [Transaction](#Transaction)
        * [.setData(data)](#Model+setData) ⇒ [Model](#Model)
        * [.insert([options])](#Model+insert) ⇒ `Promise`
        * [.update([options])](#Model+update) ⇒ `Promise`
        * [.save([options])](#Model+save) ⇒ `Promise`
        * [.fetch([options])](#Model+fetch) ⇒ `Promise`
        * [.delete([options])](#Model+delete) ⇒ `Promise`
    * _static_
        * [.fields](#Model.fields) : `object`
        * [.knorm](#Model.knorm) : [Knorm](#Knorm)
        * [.models](#Model.models) : `object`
        * [.transaction](#Model.transaction) : [Transaction](#Transaction)
        * [.insert(data, [options])](#Model.insert)
        * [.update(data, [options])](#Model.update)
        * [.save(data, [options])](#Model.save)
        * [.fetch([options])](#Model.fetch)
        * [.delete([options])](#Model.delete)

<a name="new_Model_new"></a>

### new Model([data])

| Param | Type | Description |
| --- | --- | --- |
| [data] | `object` | Data to assign to the instance. This data can be anything: data for fields (including virtual fields) or any arbitrary data. If data is provided, it's set via [setData](#Model+setData). |

Creates a [Model](#Model) instance.

<a name="Model+knorm"></a>

### model.knorm : [Knorm](#Knorm)
A reference to the [Knorm](#Knorm) instance.

::: tip
This is the same instance assigned to the [knorm](#Model.knorm) static
property, just added as a convenience for use in instance methods.
:::

<a name="Model+models"></a>

### model.models : `object`
The model registry. This is an object containing all the models added to the
ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
for more info.

::: tip
This is the same object assigned to the [models](#Model.models) static property,
just added as a convenience for use in instance methods.
:::

<a name="Model+transaction"></a>

### model.transaction : [Transaction](#Transaction)
For models accessed within a transaction, this is reference to the
[Transaction](#Transaction) instance.

::: warning NOTE
This is only set for [Model](#Model) instances that are accessed within a
transaction, otherwise it's set to `null`.
:::

::: tip
This is the same instance assigned to the [transaction](#Model+transaction) static
property, just added as a convenience for use in static methods.
:::

<a name="Model+setData"></a>

### model.setData(data) ⇒ [Model](#Model)

| Param | Type | Description |
| --- | --- | --- |
| data | `object` | The data to assign to the instance. |

Sets an instance's data, via
[Object.assign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign).

**Returns**: [Model](#Model) - the same model instance  
**Todo**

- [ ] strict mode: for virtues, check if it has a setter
- [ ] strict mode: check if all fields in the data are valid field names

<a name="Model+insert"></a>

### model.insert([options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options. |

Inserts a single row into the database.

**Returns**: `Promise` - A `Promise` that resolves with the same instance
populated with the inserted row from the dabatase. The fields to be
returned in the data can be configured with the [fields](#Query+fields) or
[returning](#Query+returning) options.  
<a name="Model+update"></a>

### model.update([options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options. |

Updates a single row in the database.

::: warning NOTE
This method requires a value for either a [primary or a unique
field](/guides/fields.md#primary-and-unique-fields) to be set on the
instance in order to know what row to update.
:::

::: tip INFO
This method sets the [first](#Query+first) (return only the first row) and
[Query#require](Query#require) (throw a [NoRowsError](NoRowsError) if no row is matched for
update) query options. However, the [Query#require](Query#require) option can be
disabled via the `options` param.
:::

**Returns**: `Promise` - A `Promise` that resolves with the same instance
populated with the updated row from the dabatase. The fields to be returned
in the data can be configured with the [fields](#Query+fields) or
[returning](#Query+returning) options.  
**Todo**

- [ ] throw [ModelError](ModelError) instead of plain `Error`

<a name="Model+save"></a>

### model.save([options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options. |

Either inserts or updates a single row in the database, depending on
whether a value for the primary field is set or not.

**Returns**: `Promise` - A `Promise` that resolves with the same instance
populated with the inserted or updated row from the dabatase. The fields to
be returned in the data can be configured with the [fields](#Query+fields) or
[returning](#Query+returning) options.  
**Todo**

- [ ] throw [ModelError](ModelError) instead of plain `Error`

<a name="Model+fetch"></a>

### model.fetch([options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options. |

Fetches a single row from the database.

::: warning NOTE
This method requires a value for either a [primary or a unique
field](/guides/fields.md#primary-and-unique-fields) to be set on the
instance in order to know what row to fetch.
:::

::: tip INFO
This method sets the [first](#Query+first) (return only the first row) and
[Query#require](Query#require) (throw a [NoRowsError](NoRowsError) if no row is matched for
fetching) query options. However, the [Query#require](Query#require) option can be
disabled via the `options` param.
:::

**Returns**: `Promise` - A `Promise` that resolves with the same instance
populated with data fetched from the database. The fields to be returned in
the data can be configured with the [fields](#Query+fields) or
[returning](#Query+returning) options.  
**Todo**

- [ ] throw [ModelError](ModelError) instead of plain `Error`

<a name="Model+delete"></a>

### model.delete([options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options. |

Deletes a single row from the database.

::: warning NOTE
This method requires a value for either a [primary or a unique
field](/guides/fields.md#primary-and-unique-fields) to be set on the
instance in order to know what row to delete.
:::

::: tip INFO
This method sets the [first](#Query+first) (return only the first row) and
[Query#require](Query#require) (throw a [NoRowsError](NoRowsError) if no row is matched for
deleting) query options. However, the [Query#require](Query#require) option can be
disabled via the `options` param.
:::

**Returns**: `Promise` - A `Promise` that resolves with the same instance
populated with the row deleted from the dabatase. The fields to be returned
in the data can be configured with the [fields](#Query+fields) or
[returning](#Query+returning) options.  
**Todo**

- [ ] throw [ModelError](ModelError) instead of plain `Error`

<a name="Model.fields"></a>

### Model.fields : `object`
As a getter, returns the fields added to the model or a model that this
model inherits. As a setter, sets the model's fields or overrides fields
added to a parent model.

<a name="Model.knorm"></a>

### Model.knorm : [Knorm](#Knorm)
A reference to the [Knorm](#Knorm) instance.

::: tip
This is the same instance assigned to the [knorm](#Model+knorm) instance
property, just added as a convenience for use in static methods.
:::

<a name="Model.models"></a>

### Model.models : `object`
The model registry. This is an object containing all the models added to the
ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
for more info.

::: tip
This is the same object assigned to the [models](#Model+models) instance
property, just added as a convenience for use in static methods.
:::

<a name="Model.transaction"></a>

### Model.transaction : [Transaction](#Transaction)
For models accessed within a transaction, this is reference to the
[Transaction](#Transaction) instance.

::: warning NOTE
This is only set for models that are accessed within a transaction, otherwise
it's set to `null`.
:::

::: tip
This is the same instance assigned to the [transaction](#Model+transaction) instance
property, just added as a convenience for use in static methods.
:::

<a name="Model.insert"></a>

### Model.insert(data, [options])

| Param | Type | Description |
| --- | --- | --- |
| data | [Model](#Model) \| `object` \| `array` | The data to insert. Can be a plain object, a [Model](#Model) instance or an array of objects or [Model](#Model) instances. |
| [options] | `object` | [Query](#Query) options ::: tip INFO This method directly proxies to [insert](#Query+insert). ::: |

Inserts a single or multiple rows into the database.

<a name="Model.update"></a>

### Model.update(data, [options])

| Param | Type | Description |
| --- | --- | --- |
| data | [Model](#Model) \| `object` \| `array` | The data to update. Can be a plain object, a [Model](#Model) instance or an array of objects or instances. |
| [options] | `object` | [Query](#Query) options ::: tip INFO This method directly proxies to [update](#Query+update). ::: |

Updates a single or multiple rows in the database.

<a name="Model.save"></a>

### Model.save(data, [options])

| Param | Type | Description |
| --- | --- | --- |
| data | [Model](#Model) \| `object` \| `array` | The data to update. Can be a plain object, a [Model](#Model) instance or an array of objects or instances. |
| [options] | `object` | [Query](#Query) options ::: tip INFO This method directly proxies to [save](#Query+save). ::: |

Either inserts or updates a single row or multiple rows in the database.

<a name="Model.fetch"></a>

### Model.fetch([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options ::: tip INFO This method directly proxies to [fetch](#Query+fetch). ::: |

Fetches a single or multiple rows from the database.

<a name="Model.delete"></a>

### Model.delete([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options ::: tip INFO This method directly proxies to [delete](#Query+delete). ::: |

Deletes a single or multiple rows from the database.

<a name="Query"></a>

## Query
Creates and runs queries and parses any data returned.


* [Query](#Query)
    * [new Query(model)](#new_Query_new)
    * _instance_
        * [.field](#Query+field) ⇒ [Query](#Query)
        * [.knorm](#Query+knorm) : [Knorm](#Knorm)
        * [.models](#Query+models) : `object`
        * [.transaction](#Query+transaction) : [Transaction](#Transaction)
        * [.batchSize(batchSize)](#Query+batchSize) ⇒ [Query](#Query)
        * [.first([first])](#Query+first) ⇒ [Query](#Query)
        * [.forge([forge])](#Query+forge) ⇒ [Query](#Query)
        * [.lean([lean])](#Query+lean) ⇒ [Query](#Query)
        * [.fields(...fields)](#Query+fields) ⇒ [Query](#Query)
        * [.returning(...fields)](#Query+returning) ⇒ [Query](#Query)
        * [.execute(sql)](#Query+execute) ⇒ `Promise`
        * [.connect()](#Query+connect) ⇒ `Promise`
        * [.formatSql(sql)](#Query+formatSql) ⇒ `object`
        * [.query(sql)](#Query+query) ⇒ `Promise`
        * [.close()](#Query+close) ⇒ `Promise`
        * [.insert(data, [options])](#Query+insert) ⇒ `Promise`
        * [.update(data, [options])](#Query+update) ⇒ `Promise`
        * [.save(data, [options])](#Query+save)
        * [.fetch([options])](#Query+fetch) ⇒ `Promise`
        * [.delete([options])](#Query+delete) ⇒ `Promise`
    * _static_
        * [.FetchError](#Query.FetchError) ⇐ [QueryError](#Query.QueryError)
        * [.InsertError](#Query.InsertError) ⇐ [QueryError](#Query.QueryError)
        * [.UpdateError](#Query.UpdateError) ⇐ [QueryError](#Query.QueryError)
        * [.DeleteError](#Query.DeleteError) ⇐ [QueryError](#Query.QueryError)
        * [.NoRowsFetchedError](#Query.NoRowsFetchedError) ⇐ [NoRowsError](#Query.NoRowsError)
        * [.NoRowsInsertedError](#Query.NoRowsInsertedError) ⇐ [NoRowsError](#Query.NoRowsError)
        * [.NoRowsUpdatedError](#Query.NoRowsUpdatedError) ⇐ [NoRowsError](#Query.NoRowsError)
        * [.NoRowsDeletedError](#Query.NoRowsDeletedError) ⇐ [NoRowsError](#Query.NoRowsError)
        * [.Connection](#Query.Connection) : [Connection](#Connection)
        * [.QueryError](#Query.QueryError)
        * [.NoRowsError](#Query.NoRowsError)
        * [.knorm](#Query.knorm) : [Knorm](#Knorm)
        * [.models](#Query.models) : `object`
        * [.transaction](#Query.transaction) : [Transaction](#Transaction)

<a name="new_Query_new"></a>

### new Query(model)

| Param | Type |
| --- | --- |
| model | [Model](#Model) | 

Creates a new Query instance.

<a name="Query+field"></a>

### query.field ⇒ [Query](#Query)

| Param | Type | Description |
| --- | --- | --- |
| fields | `string` \| `array` \| `object` | The field to return. |

Alias for [fields](#Query+fields), improves code readability when configuring a
single field.

::: tip INFO
This is an alias for [fields](#Query+fields).
:::

**Returns**: [Query](#Query) - The same [Query](#Query) instance to allow chaining.  
**See**: [fields](#Query+fields)  
<a name="Query+knorm"></a>

### query.knorm : [Knorm](#Knorm)
A reference to the [Knorm](#Knorm) instance.

::: tip
This is the same instance assigned to the [knorm](#Query.knorm) static
property, just added as a convenience for use in instance methods.
:::

<a name="Query+models"></a>

### query.models : `object`
The model registry. This is an object containing all the models added to the
ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
for more info.

::: tip
This is the same object assigned to the [models](#Query.models) static property,
just added as a convenience for use in instance methods.
:::

<a name="Query+transaction"></a>

### query.transaction : [Transaction](#Transaction)
For models accessed within a transaction, this is reference to the
[Transaction](#Transaction) instance.

::: warning NOTE
This is only set for models that are accessed within a transaction, otherwise
it's set to `null`.
:::

::: tip
This is the same instance assigned to the [transaction](#Query+transaction) static
property, just added as a convenience for use in static methods.
:::

<a name="Query+batchSize"></a>

### query.batchSize(batchSize) ⇒ [Query](#Query)

| Param | Type | Description |
| --- | --- | --- |
| batchSize | `number` | The number of items to send in a single INSERT or UPDATE query (where array updates are supported). |

Configures the batch-size for [insert](#Query+insert) and [update](#Query+update)
(where batch updates are supported). When a batch-size is configured and
either of these operations is called with an array of data, multiple
queries will be sent to the database instead of a single one. If any data
is returned from the queries, it is merged into a single array instead of
returning multiple arrays.

::: tip INFO
The queries are sent to the database in parallel (i.e. via `Promise.all`).
Take that into consideration when deciding how many queries to send vs how
many items to have in a single query.
:::

::: warning NOTE
When using this option, the order of the items in the array returned is
unlikely to match the order of the rows in the original array. This is
because the queries are sent in parallel and are not guaranteed to complete
in the same order.
:::

**Returns**: [Query](#Query) - The same [Query](#Query) instance to allow chaining.  
<a name="Query+first"></a>

### query.first([first]) ⇒ [Query](#Query)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [first] | `boolean` | <code>true</code> | If `true`, return the first item, else return an array. |

Configures whether or not to return the first item in a result set from the
database from a [fetch](#Query+fetch), [insert](#Query+insert),
[update](#Query+update) or [delete](#Query+delete) operation, instead of
returning an array. This is handy when one is sure that there's only one
item in the rows returned from the database.

**Returns**: [Query](#Query) - The same [Query](#Query) instance to allow chaining.  
<a name="Query+forge"></a>

### query.forge([forge]) ⇒ [Query](#Query)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [forge] | `boolean` | <code>true</code> | If `true`, return [Model](#Model) instances, else return plain objects. |

Configures whether to return [Model](#Model) instances or plain objects from
a [fetch](#Query+fetch), [insert](#Query+insert), [update](#Query+update) or
[delete](#Query+delete) operation. When `forge` is `true`, items in the
returned array will be instances of the the [Model](#Model) class that is
passed to the [Query](#Query) constructor.

::: tip INFO
[Model](#Model) instances will be returned by default. To disable that, pass
`false` as the value to this option.
:::

::: tip INFO
This is the opposite of [lean](#Query+lean).
:::

**Returns**: [Query](#Query) - The same [Query](#Query) instance to allow chaining.  
<a name="Query+lean"></a>

### query.lean([lean]) ⇒ [Query](#Query)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [lean] | `boolean` | <code>true</code> | If `true`, return plain objects, else return [Model](#Model) instances. |

Configures whether to return [Model](#Model) instances or plain objects from
a [fetch](#Query+fetch), [insert](#Query+insert), [update](#Query+update) or
[delete](#Query+delete) operation. When `lean` is `false`, items in the
returned array will be instances of the the [Model](#Model) class that is
passed to the [Query](#Query) constructor.

::: tip INFO
[Model](#Model) instances will be returned by default. To disable that, pass
`true` as the value to this option.
:::

::: tip INFO
This is the opposite of [forge](#Query+forge).
:::

**Returns**: [Query](#Query) - The same [Query](#Query) instance to allow chaining.  
<a name="Query+fields"></a>

### query.fields(...fields) ⇒ [Query](#Query)

| Param | Type | Description |
| --- | --- | --- |
| ...fields | `string` \| `array` \| `object` | The fields to return. When passed as an object, the keys are used as aliases while the values are used in the query. This also allows you to use raw SQL. |

Configures what fields to return from a database call.

::: tip INFO
This is also aliased as [returning](#Query+returning).
:::

**Returns**: [Query](#Query) - The same [Query](#Query) instance to allow chaining.  
**Example**  
For PostgreSQL:
```js{10}
Model.insert(
  {
    firstName: 'Foo',
    lastName: 'Bar',
  },
  {
    returning: {
      firstName: 'firstName',
      lastName: 'lastName',
      fullNames: Model.query.sql(`"firstName" || ' ' || upper("lastName")`)
    }
  }
);
```
<a name="Query+returning"></a>

### query.returning(...fields) ⇒ [Query](#Query)

| Param | Type | Description |
| --- | --- | --- |
| ...fields | `string` \| `array` \| `object` | The fields to return. |

Configures what fields to return from a database call.

::: tip INFO
This is an alias for [fields](#Query+fields).
:::

**Returns**: [Query](#Query) - The same [Query](#Query) instance to allow chaining.  
**See**: [fields](#Query+fields)  
<a name="Query+execute"></a>

### query.execute(sql) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| sql | `SqlBricks` \| `object` \| `string` \| `array` | The SQL to run. When passed as an array, it can be an array of `SqlBricks` instances, objects or strings. |
| sql.text | `string` | The parameterized SQL string (with placeholders), when `sql` is passed as an object. |
| sql.values | `array` | The values for the parameterized SQL string, when `sql` is passed as an object. |

Executes a query. This method calls, in order, [connect](#Query+connect) to
connect to the database, [formatSql](#Query+formatSql) to format the SQL to be
queried, [query](#Query+query) to run the query against the database, and
finally, [close](#Query+close) to close the database connection.

::: tip INFO
This method is used internally by all [Query](#Query) methods i.e.
[fetch](#Query+fetch), [insert](#Query+insert), [update](#Query+update) and
[delete](#Query+delete).
:::

::: tip INFO
When the `sql` parameter is an array, a single database connection will be
created but [formatSql](#Query+formatSql) and [query](#Query+query) will be called
for each item in the array.

Also note that the queries are run in parallel (via `Promise.all`) and the
rows returned from each query are merged into a single array (via
`Array.prototype.concat`).
:::

**Returns**: `Promise` - A `Promise` that is resolved with an array of rows
returned from running the query.

::: tip INFO
If [query](#Query+query) rejects with an error, the SQL that caused the error
is attached to the error as an `sql` property.
:::  
<a name="Query+connect"></a>

### query.connect() ⇒ `Promise`
Connects to the database, via [create](#Connection+create). This method is
called by [execute](#Query+execute).

**Returns**: `Promise` - The `Promise` from [create](#Connection+create), that is
resolved when a connection is established or rejected with a
[QueryError](QueryError) on error.  
<a name="Query+formatSql"></a>

### query.formatSql(sql) ⇒ `object`

| Param | Type | Description |
| --- | --- | --- |
| sql | `SqlBricks` \| `object` \| `string` | The SQL to be formatted. |
| sql.text | `string` | The parameterized SQL string (with placeholders), when `sql` is passed as an object. |
| sql.values | `array` | The values for the parameterized SQL string, when `sql` is passed as an object. |

Formats SQL before it's sent to the database. This method is called
by [execute](#Query+execute) and allows manipulating or changing the SQL
before it's run via [query](#Query+query).

**Returns**: `object` - An object with `text` and `values` properties. Note that
when `sql` is passed as a string, the object returned has no `values`
property. When an [SqlBricks](SqlBricks) instance is passed, an  object is
returned (via [`toParams`](https://csnw.github.io/sql-bricks/#toParams)).  
<a name="Query+query"></a>

### query.query(sql) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| sql | `object` \| `string` | The SQL to be run, after it's formatted via [formatSql](#Query+formatSql). |

Runs a query against the database, via [query](#Connection+query). This
method is called by [execute](#Query+execute).

**Returns**: `Promise` - The `Promise` from [query](#Connection+query), that is
resolved with the query result or rejected with a [QueryError](QueryError) on
error.  
<a name="Query+close"></a>

### query.close() ⇒ `Promise`
Closes the database connection after running the query, via
[close](#Connection+close). This method is called by [execute](#Query+execute).

**Returns**: `Promise` - The `Promise` from [close](#Connection+close), that is
resolved when the connection is closed or rejected with a
[QueryError](QueryError) on error.  
<a name="Query+insert"></a>

### query.insert(data, [options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| data | [Model](#Model) \| `object` \| `array` | The data to insert. Can be a plain object, a [Model](#Model) instance or an array of objects or [Model](#Model) instances. |
| [options] | `object` | [Query](#Query) options ::: tip INFO When the [batchSize](#Query+batchSize) option is set, multiple insert batches are created and multiple queries are sent to the database, but on the same database connection. ::: |

Inserts data into the database.

**Returns**: `Promise` - the promise is resolved with an array of the model's
instances, expect in the following cases:

- if the [forge](#Query+forge) query option was set to `false` (or
  [lean](#Query+lean) set to `true`), then the array will contain plain
  objects.
- if the [first](#Query+first) query option was set to `true`, then the
  promise is resolved with a single model instance (by default) or plain
  object (if the [forge](#Query+forge) query option was set to `true`), or
  `null` if no rows were inserted.
- if no rows were inserted, then the array will be empty. If the
  [Query#require](Query#require) query option was set to `true`, then the `Promise`
  is rejected with a [NoRowsInsertedError](#Query.NoRowsInsertedError) instead.
 - if the insert query failed, then the `Promise` is rejected with a
   [InsertError](#Query.InsertError) instead.  
**Todo**

- [ ] Add support for inserting joined models (via
[@knorm/relations](https://github.com/knorm/relations))
- [ ] debug/strict mode: throw/warn if data is empty

<a name="Query+update"></a>

### query.update(data, [options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| data | [Model](#Model) \| `object` \| `array` | The data to update. Can be a plain object, a [Model](#Model) instance or an array of objects or instances. |
| [options] | `object` | [Query](#Query) options |

Updates data in the database.

::: warning NOTE
When the `data` param is a single object or [Model](#Model) instance and the
[Query#where](Query#where) option is not set, **ALL rows in the table will be
updated!** This mimics the behaviour of `UPDATE` queries. However, if the
primary field is set in the data, then only the row matching the primary
field is updated.
:::

::: tip INFO
The `data` param only works as an array in conjunction with plugins that
support updating multiple (ideally, in a single query) e.g.
[@knorm/postgres](https://github.com/knorm/postgres).
:::

::: tip INFO
When the [batchSize](#Query+batchSize) option is set, multiple update batches are
created and multiple queries are sent to the database, but on the same
database connection.
:::

**Returns**: `Promise` - the promise is resolved with an array of the model's
instances, expect in the following cases:

- if the [forge](#Query+forge) query option was set to `false` (or
  [lean](#Query+lean) set to `true`), then the array will contain plain
  objects.
- if the [first](#Query+first) query option was set to `true`, then the
  promise is resolved with a single model instance (by default) or plain
  object (if the [forge](#Query+forge) query option was set to `true`), or
  `null` if no rows were inserted.
- if no rows were updated, then the array will be empty. If the
  [Query#require](Query#require) query option was set to `true`, then the `Promise`
  is rejected with a [NoRowsUpdatedError](#Query.NoRowsUpdatedError) instead.
 - if the update query failed, then the `Promise` is rejected with a
   [UpdateError](#Query.UpdateError) instead.  
**Todo**

- [ ] Add support for updating joined models (via
[@knorm/relations](https://github.com/knorm/relations))
- [ ] Update a single row when unique fields are set (in addition to
the primary field being set)
- [ ] debug/strict mode: throw/warn if data is empty

<a name="Query+save"></a>

### query.save(data, [options])

| Param | Type | Description |
| --- | --- | --- |
| data | [Model](#Model) \| `object` \| `array` | The data to update. Can be a plain object, a [Model](#Model) instance or an array of objects or instances. |
| [options] | `object` | [Query](#Query) options |

Either inserts or updates data in the database.

::: warning NOTE
When the `data` param is a single object or [Model](#Model) instance and the
[Query#where](Query#where) option is not set, **ALL rows in the table will be
updated!** This mimics the behaviour of `UPDATE` queries. However, if the
primary field is set in the data, then only the row matching the primary
field is updated.
:::

::: tip INFO
- when the `data` param is an array, this method proxies to
  [insert](#Query+insert).
- when the `data` param is an object and the primary field is **not** set,
  this method proxies to [insert](#Query+insert). However, if the primary
  field is set, then the method proxies to [update](#Query+update).
:::

<a name="Query+fetch"></a>

### query.fetch([options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options |

Fetches data from the database.

**Returns**: `Promise` - the promise is resolved with an array of the model's
instances, expect in the following cases:

 - if the [forge](#Query+forge) query option was set to `false` (or
  [lean](#Query+lean) set to `true`), then the array will contain plain
  objects.
- if the [first](#Query+first) query option was set to `true`, then the
  promise is resolved with a single model instance (by default) or plain
  object (if the [forge](#Query+forge) query option was set to `true`), or
  `null` if no rows were inserted.
- if no rows were updated, then the array will be empty. If the
  [Query#require](Query#require) query option was set to `true`, then the `Promise`
  is rejected with a [NoRowsFetchedError](#Query.NoRowsFetchedError) instead.
 - if the fetch query failed, then the `Promise` is rejected with a
   [FetchError](#Query.FetchError) instead.  
**Todo**

- [ ] [@knorm/relations](https://github.com/knorm/relations)): throw if a
fetch  is attempted from a joined query
- [ ] [@knorm/relations](https://github.com/knorm/relations)): add support
for limit and offset options in joined queries (probably with a subquery)

<a name="Query+delete"></a>

### query.delete([options]) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options |

Deletes data from the database.

::: warning NOTE
If the [Query#where](Query#where) option is not set, **ALL rows in the table will
be deleted!** This mimics the behaviour of `DELETE` queries.
:::

**Returns**: `Promise` - the promise is resolved with an array of the model's
instances, expect in the following cases:

- if the [forge](#Query+forge) query option was set to `false` (or
  [lean](#Query+lean) set to `true`), then the array will contain plain
  objects.
- if the [first](#Query+first) query option was set to `true`, then the
  promise is resolved with a single model instance (by default) or plain
  object (if the [forge](#Query+forge) query option was set to `true`), or
  `null` if no rows were inserted.
- if no rows were updated, then the array will be empty. If the
  [Query#require](Query#require) query option was set to `true`, then the `Promise`
  is rejected with a [NoRowsDeletedError](#Query.NoRowsDeletedError) instead.
 - if the delete query failed, then the `Promise` is rejected with a
   [DeleteError](#Query.DeleteError) instead.  
**Todo**

- [ ] [@knorm/relations](https://github.com/knorm/relations)): add support
for deleting joined queries

<a name="Query.FetchError"></a>

### Query.FetchError ⇐ [QueryError](#Query.QueryError)
The rejection error from [fetch](#Query+fetch) on error.

**Extends**: [QueryError](#Query.QueryError)  
<a name="Query.InsertError"></a>

### Query.InsertError ⇐ [QueryError](#Query.QueryError)
The rejection error from [insert](#Query+insert) on error.

**Extends**: [QueryError](#Query.QueryError)  
<a name="Query.UpdateError"></a>

### Query.UpdateError ⇐ [QueryError](#Query.QueryError)
The rejection error from [update](#Query+update) on error.

**Extends**: [QueryError](#Query.QueryError)  
<a name="Query.DeleteError"></a>

### Query.DeleteError ⇐ [QueryError](#Query.QueryError)
The rejection error from [delete](#Query+delete) on error.

**Extends**: [QueryError](#Query.QueryError)  
<a name="Query.NoRowsFetchedError"></a>

### Query.NoRowsFetchedError ⇐ [NoRowsError](#Query.NoRowsError)
The rejection error from [fetch](#Query+fetch) when no rows are fetched and the
[Query#require](Query#require) option was set.

**Extends**: [NoRowsError](#Query.NoRowsError)  
<a name="Query.NoRowsInsertedError"></a>

### Query.NoRowsInsertedError ⇐ [NoRowsError](#Query.NoRowsError)
The rejection error from [insert](#Query+insert) when no rows are inserted and
the [Query#require](Query#require) option was set.

**Extends**: [NoRowsError](#Query.NoRowsError)  
<a name="Query.NoRowsUpdatedError"></a>

### Query.NoRowsUpdatedError ⇐ [NoRowsError](#Query.NoRowsError)
The rejection error from [update](#Query+update) when no rows are updated and
the [Query#require](Query#require) option was set.

**Extends**: [NoRowsError](#Query.NoRowsError)  
<a name="Query.NoRowsDeletedError"></a>

### Query.NoRowsDeletedError ⇐ [NoRowsError](#Query.NoRowsError)
The rejection error from [delete](#Query+delete) when no rows are deleted and
the [Query#require](Query#require) option was set.

**Extends**: [NoRowsError](#Query.NoRowsError)  
<a name="Query.Connection"></a>

### Query.Connection : [Connection](#Connection)
A reference to [Connection](#Connection), for use within [Query](#Query).

<a name="Query.QueryError"></a>

### Query.QueryError
The base error that all errors thrown by [Query](#Query) inherit from.

<a name="Query.NoRowsError"></a>

### Query.NoRowsError
The base error for all errors thrown by [Query](#Query) when the
[Query#require](Query#require) option is set.

<a name="Query.knorm"></a>

### Query.knorm : [Knorm](#Knorm)
A reference to the [Knorm](#Knorm) instance.

::: tip
This is the same instance assigned to the [knorm](#Query+knorm) instance
property, just added as a convenience for use in static methods.
:::

<a name="Query.models"></a>

### Query.models : `object`
The model registry. This is an object containing all the models added to the
ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
for more info.

::: tip
This is the same object assigned to the [models](#Query+models) instance
property, just added as a convenience for use in static methods.
:::

<a name="Query.transaction"></a>

### Query.transaction : [Transaction](#Transaction)
For models accessed within a transaction, this is reference to the
[Transaction](#Transaction) instance.

::: warning NOTE
This is only set for [Query](#Query) instances that are running within a
transaction, otherwise it's set to `null`.
:::

::: tip
This is the same instance assigned to the [transaction](#Query+transaction) instance
property, just added as a convenience for use in static methods.
:::

<a name="Transaction"></a>

## Transaction
Creates and executes transactions, allowing multiple queries to be run within
a transaction.


* [Transaction](#Transaction)
    * [new Transaction([callback])](#new_Transaction_new)
    * _instance_
        * [.knorm](#Transaction+knorm) : [Knorm](#Knorm)
        * [.models](#Transaction+models) : `object`
        * [.connect()](#Transaction+connect) ⇒ `Promise`
        * [.close()](#Transaction+close) ⇒ `Promise`
        * [.begin()](#Transaction+begin) ⇒ `Promise`
        * [._begin()](#Transaction+_begin) ⇒ `Promise`
        * [.commit()](#Transaction+commit) ⇒ `Promise`
        * [._commit()](#Transaction+_commit) ⇒ `Promise`
        * [.rollback()](#Transaction+rollback) ⇒ `Promise`
        * [._rollback()](#Transaction+_rollback) ⇒ `Promise`
        * [.execute()](#Transaction+execute) ⇒ `Promise`
        * [.then()](#Transaction+then) ⇒ `Promise`
        * [.catch()](#Transaction+catch) ⇒ `Promise`
    * _static_
        * [.TransactionError](#Transaction.TransactionError)
        * [.knorm](#Transaction.knorm) : [Knorm](#Knorm)
        * [.models](#Transaction.models) : `object`
        * [.Connection](#Transaction.Connection) : [Connection](#Connection)

<a name="new_Transaction_new"></a>

### new Transaction([callback])

| Param | Type | Description |
| --- | --- | --- |
| [callback] | `function` | The transaction callback, when [running transactions with a callback function](/guides/transactions.md#transactions-with-a-callback). |

Creates a [Transaction](#Transaction) instance.

<a name="Transaction+knorm"></a>

### transaction.knorm : [Knorm](#Knorm)
A reference to the [Knorm](#Knorm) instance.

::: tip
This is the same instance assigned to the [knorm](#Transaction.knorm) static
property, just added as a convenience for use in instance methods.
:::

<a name="Transaction+models"></a>

### transaction.models : `object`
The model registry. This is an object containing all the models added to the
ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
for more info.

::: tip
This is the same object assigned to the [models](#Transaction.models) static
property, just added as a convenience for use in instance methods.
:::

<a name="Transaction+connect"></a>

### transaction.connect() ⇒ `Promise`
Connects to the database, via [create](#Connection+create). This method is
called by [begin](#Transaction+begin) or by [connect](#Query+connect) when
queries are executed within transactions.

**Returns**: `Promise` - The `Promise` from [create](#Connection+create), that is
resolved when a connection is established or rejected with a
[TransactionError](TransactionError) on error.  
<a name="Transaction+close"></a>

### transaction.close() ⇒ `Promise`
Closes the database connection (via [close](#Connection+close)) after
committing (via [commit](#Transaction+commit)) or rolling back (via
[rollback](#Transaction+rollback)) a transaction.

**Returns**: `Promise` - The `Promise` from [close](#Connection+close), that is
resolved when the connection is closed or rejected with a
[QueryError](QueryError) on error.  
<a name="Transaction+begin"></a>

### transaction.begin() ⇒ `Promise`
Begins a transaction, via [_begin](#Transaction+_begin). If no database
connection exists, one is created via [connect](#Transaction+connect).

**Returns**: `Promise` - A `Promise` that is resolved when the transaction is begun
or rejected with a [TransactionError](TransactionError) on error.  
<a name="Transaction+_begin"></a>

### transaction._begin() ⇒ `Promise`
Sends a `BEGIN` query (via [query](#Connection+query)) to start a
transaction. This can be overloaded to send a different query e.g. `START
TRANSACTION`.

**Returns**: `Promise` - The `Promise` from [query](#Connection+query), that is
resolved with the query result.  
<a name="Transaction+commit"></a>

### transaction.commit() ⇒ `Promise`
Commits a transaction, via [_commit](#Transaction+_commit) and afterwards
closes the database connection, via [close](#Transaction+close). If the
commit fails, the transaction is automaticaly rolled back via
[rollback](#Transaction+rollback).

**Returns**: `Promise` - A `Promise` that is resolved when the transaction is
committed and the connection closed or rejected with a
[TransactionError](TransactionError) on error.  
<a name="Transaction+_commit"></a>

### transaction._commit() ⇒ `Promise`
Sends a `COMMIT` query (via [query](#Connection+query)) to commit a
transaction. This can be overloaded to send a different query.

**Returns**: `Promise` - The `Promise` from [query](#Connection+query), that is
resolved with the query result.  
<a name="Transaction+rollback"></a>

### transaction.rollback() ⇒ `Promise`
Rolls back a transaction, via [_rollback](#Transaction+_rollback) and afterwards
closes the database connection, via [close](#Transaction+close).

**Returns**: `Promise` - A `Promise` that is resolved when the transaction is
rolled back and the connection closed or rejected with a
[TransactionError](TransactionError) on error.  
<a name="Transaction+_rollback"></a>

### transaction._rollback() ⇒ `Promise`
Sends a `ROLLBACK` query (via [query](#Connection+query)) to roll back a
transaction. This can be overloaded to send a different query.

**Returns**: `Promise` - The `Promise` from [query](#Connection+query), that is
resolved with the query result.  
<a name="Transaction+execute"></a>

### transaction.execute() ⇒ `Promise`
Executes a transaction when [running a transaction with a callback
function](/guides/transactions.md#transactions-with-a-callback). This
method begins a transaction (via [begin](#Transaction+begin)), executes the
callback function and commits the transaction (via
[commit](#Transaction+commit)).

**Returns**: `Promise` - A `Promise` that is resolved with the resolution value
of the callback function.  
<a name="Transaction+then"></a>

### transaction.then() ⇒ `Promise`
Simulates a `Promise` interface. This method calls
[execute](#Transaction+execute) and resolves with it's resolution value.

**Example**  
```js
(async function() {
  const value = await new Transaction(async transaction => {
    return 'foo';
  });

  console.log(value); // => 'foo'
})();
```
**Example**  
```js
new Transaction(async transaction => {
  return 'foo';
}).then(value => {
  console.log(value); // => 'foo'
});
```
<a name="Transaction+catch"></a>

### transaction.catch() ⇒ `Promise`
Simulates a `Promise` interface. This method calls
[execute](#Transaction+execute) and calls `catch` on the promise returned.

**Example**  
```js
(async function() {
  try {
    const value = await new Transaction(async transaction => {
      throw new Error('foo');
    });
  } catch (e) {
    console.log(e.message); // => 'foo'
  }
})();
```
**Example**  
```js
new Transaction(async transaction => {
  throw new Error('foo');
}).catch(e => {
  console.log(e.message); // => 'foo'
});
```
<a name="Transaction.TransactionError"></a>

### Transaction.TransactionError
The base error that all errors thrown by [Transaction](#Transaction) inherit from.

<a name="Transaction.knorm"></a>

### Transaction.knorm : [Knorm](#Knorm)
A reference to the [Knorm](#Knorm) instance.

::: tip
This is the same instance assigned to the [knorm](#Transaction+knorm) instance
property, just added as a convenience for use in static methods.
:::

<a name="Transaction.models"></a>

### Transaction.models : `object`
The model registry. This is an object containing all the models added to the
ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
for more info.

::: tip
This is the same object assigned to the [models](#Transaction+models) instance
property, just added as a convenience for use in static methods.
:::

<a name="Transaction.Connection"></a>

### Transaction.Connection : [Connection](#Connection)
A reference to [Connection](#Connection), for use within [Transaction](#Transaction).

