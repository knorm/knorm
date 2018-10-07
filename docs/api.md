## Classes

<dl>
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

<a name="Field"></a>

## Field
Creates and holds configuration for fields, e.g. how to validate or cast
fields.

<a name="new_Field_new"></a>

### new Field([config])

| Param | Type | Description |
| --- | --- | --- |
| [config] | `object` | The field's configuration. |

Creates a [Field](#Field) instance.

<a name="Knorm"></a>

## Knorm
Creates and configures ORMs.


* [Knorm](#Knorm)
    * [new Knorm([config])](#new_Knorm_new)
    * _instance_
        * [.Field](#Knorm+Field) : [Field](#Field)
        * [.Model](#Knorm+Model) : [Model](#Model)
        * [.Query](#Knorm+Query) : [Query](#Query)
        * [.Transaction](#Knorm+Transaction) : [Transaction](#Transaction)
        * [.use(plugin)](#Knorm+use) ⇒ [Knorm](#Knorm)
        * [.addModel(model)](#Knorm+addModel)
        * [.clone()](#Knorm+clone) ⇒ [Knorm](#Knorm)
    * _static_
        * [.KnormError](#Knorm.KnormError) : `KnormError`

<a name="new_Knorm_new"></a>

### new Knorm([config])

| Param | Type | Description |
| --- | --- | --- |
| [config] | `object` | the ORM's configuration. |
| config.fieldToColumn | `function` | a function to convert all field-names  to column names, for example [snakeCase](https://lodash.com/docs/4.17.10#snakeCase). |
| config.debug | `boolean` \| `object` | whether or not to enable debug mode. If set to `true`, then the default debug mode config is set, which is: ```js {   stackTraces: true,   errorSqlValues: true,   logSql: false } ``` See [the debugging guide](/guides/debugging) for more info. |

Creates a new ORM instance. Every ORM instance has it's own set of classes
and configurations, which allows creating multiple ORM's in a single
application.

<a name="Knorm+Field"></a>

### knorm.Field : [Field](#Field)
The ORM's [Field](#Field) class.

<a name="Knorm+Model"></a>

### knorm.Model : [Model](#Model)
The ORM's [Model](#Model) class.

<a name="Knorm+Query"></a>

### knorm.Query : [Query](#Query)
The ORM's [Query](#Query) class.

<a name="Knorm+Transaction"></a>

### knorm.Transaction : [Transaction](#Transaction)
The ORM's [Transaction](#Transaction) class.

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
<a name="Knorm.KnormError"></a>

### Knorm.KnormError : `KnormError`
A reference to the [KnormError](KnormError) class.

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
        * [.insert([options])](#Model+insert) ⇒ [Promise.&lt;Model&gt;](#Model)
        * [.update([options])](#Model+update) ⇒ [Promise.&lt;Model&gt;](#Model)
        * [.save([options])](#Model+save) ⇒ [Promise.&lt;Model&gt;](#Model)
        * [.fetch([options])](#Model+fetch) ⇒ [Promise.&lt;Model&gt;](#Model)
        * [.delete([options])](#Model+delete) ⇒ [Promise.&lt;Model&gt;](#Model)
    * _static_
        * [.fields](#Model.fields) : `object`
        * [.knorm](#Model.knorm) : [Knorm](#Knorm)
        * [.models](#Model.models) : `object`
        * [.transaction](#Model.transaction) : [Transaction](#Transaction)
        * [.insert(data, options)](#Model.insert) ⇒ `Promise`

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
This is only set for models that are accessed within a transaction, otherwise
it's set to `null`.
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

### model.insert([options]) ⇒ [Promise.&lt;Model&gt;](#Model)

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options. |

Inserts a single row into the database.

**Returns**: [Promise.&lt;Model&gt;](#Model) - the same instance populated with the inserted row
from the dabatase. The fields to be returned in the data can be configured
with the [fields](#Query+fields) or [returning](#Query+returning) options.  
<a name="Model+update"></a>

### model.update([options]) ⇒ [Promise.&lt;Model&gt;](#Model)

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
This method sets the [Query#first](Query#first) (return only the first row) and
[Query#require](Query#require) (throw a [NoRowsError](NoRowsError) if no row is matched for
update) query options. However, the [Query#require](Query#require) option can be
disabled via the `options` param.
:::

**Returns**: [Promise.&lt;Model&gt;](#Model) - the same instance populated with the updated row
from the dabatase. The fields to be returned in the data can be configured
with the [fields](#Query+fields) or [returning](#Query+returning) options.  
**Todo**

- [ ] throw [ModelError](ModelError) instead of plain Error

<a name="Model+save"></a>

### model.save([options]) ⇒ [Promise.&lt;Model&gt;](#Model)

| Param | Type | Description |
| --- | --- | --- |
| [options] | `object` | [Query](#Query) options. |

Either inserts or updates a single row in the database, depending on
whether a value for the primary field is set or not.

**Returns**: [Promise.&lt;Model&gt;](#Model) - the same instance populated with the inserted or
updated row from the dabatase. The fields to be returned in the data can be
configured with the [fields](#Query+fields) or [returning](#Query+returning)
options.  
**Todo**

- [ ] throw [ModelError](ModelError) instead of plain Error

<a name="Model+fetch"></a>

### model.fetch([options]) ⇒ [Promise.&lt;Model&gt;](#Model)

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
This method sets the [Query#first](Query#first) (return only the first row) and
[Query#require](Query#require) (throw a [NoRowsError](NoRowsError) if no row is matched for
fetching) query options. However, the [Query#require](Query#require) option can be
disabled via the `options` param.
:::

**Returns**: [Promise.&lt;Model&gt;](#Model) - the same instance populated with data fetched from
the database. The fields to be returned in the data can be configured with
the [fields](#Query+fields) or [returning](#Query+returning) options.  
**Todo**

- [ ] throw [ModelError](ModelError) instead of plain Error

<a name="Model+delete"></a>

### model.delete([options]) ⇒ [Promise.&lt;Model&gt;](#Model)

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
This method sets the [Query#first](Query#first) (return only the first row) and
[Query#require](Query#require) (throw a [NoRowsError](NoRowsError) if no row is matched for
deleting) query options. However, the [Query#require](Query#require) option can be
disabled via the `options` param.
:::

**Returns**: [Promise.&lt;Model&gt;](#Model) - the same instance populated with the row deleted
from the dabatase. The fields to be returned in the data can be configured
with the [fields](#Query+fields) or [returning](#Query+returning) options.  
**Todo**

- [ ] throw [ModelError](ModelError) instead of plain Error

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

### Model.insert(data, options) ⇒ `Promise`

| Param | Type | Description |
| --- | --- | --- |
| data | [Model](#Model) \| `object` \| `array` | The data to insert. Can be a plain object, a [Model](#Model) instance or an array of objects or instances. |
| options | `object` | [Query](#Query) options |

Inserts a single or multiple rows into the database.

**Returns**: `Promise` - the promise is resolved with an array of the model's
instances, expect in the following cases:
- if the [Query#forge](Query#forge) query option was set to `false` (or
  [Query#lean](Query#lean) set to `true`), then the array will contain plain
  objects.
- if no rows were inserted, then the array will be empty. If the
  [Query#require](Query#require) query option was set to `true`, then the promise is
  rejected with a [NoRowsInsertedError](NoRowsInsertedError) instead.
- if the [Query#first](Query#first) query option was set to `true`, then the
  promise is resolved with a single model instance (by default) or plain
  object (if the [Query#forge](Query#forge) query option was set to `true`), or
  `null` if no rows were inserted.  
<a name="Query"></a>

## Query
Creates and runs queries and parses any data returned.


* [Query](#Query)
    * [new Query(model)](#new_Query_new)
    * [.fields(...fields)](#Query+fields) ⇒ [Query](#Query)
    * [.returning(...fields)](#Query+returning) ⇒ [Query](#Query)
    * [.beforeQuery(client, sql)](#Query+beforeQuery)
    * [.afterQuery(client, sql, result)](#Query+afterQuery)
    * [.query(sql)](#Query+query)

<a name="new_Query_new"></a>

### new Query(model)

| Param | Type |
| --- | --- |
| model | [Model](#Model) | 

Creates a new Query instance.

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
Using raw SQL (with PostgreSQL):
```js {10}
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
<a name="Query+beforeQuery"></a>

### query.beforeQuery(client, sql)

| Param | Type | Description |
| --- | --- | --- |
| client | `Client` | the database client that will be used to run the query. |
| sql | `SqlBricks` \| `object` \| `string` | the sql that will be sent to the database. |

Called before a query is sent to the database. This allows manipulating the
sql if needed, even changing it entirely.

NOTE: if this method returns anything, that will be used as the sql to send
to the database instead. Therefore, this should be valid sql as expected by
[query](#Query+query).

<a name="Query+afterQuery"></a>

### query.afterQuery(client, sql, result)

| Param | Type | Description |
| --- | --- | --- |
| client | `Client` | the database client that was used to run the query. |
| sql | `SqlBricks` \| `object` \| `string` | the sql that was sent to the database to generate the result. |
| result | `object` | the result from the database. |

Called after a query is sent to the database. This allows manipulating the
result if needed, even changing it entirely.

NOTE: if this method returns anything, that will be used as the result of
the query instead. Therefore, this should be a valid result object as
expected by [query](#Query+query).

<a name="Query+query"></a>

### query.query(sql)

| Param | Type |
| --- | --- |
| sql | `SqlBricks` \| `object` \| `string` | 

Runs a query. This method is not implemented in @knorm/knorm, it's meant to
be implemented by a plugin that provides database access.

**Throws**:

- `QueryError` if the method is not implemented.

<a name="Transaction"></a>

## Transaction
Creates and executes transactions, allowing multiple queries to be run within
a transaction.


* [Transaction](#Transaction)
    * [new Transaction([callback])](#new_Transaction_new)
    * [.beforeQuery(client, sql)](#Transaction+beforeQuery)
    * [.afterQuery(client, sql, result)](#Transaction+afterQuery)
    * [.query(sql)](#Transaction+query)

<a name="new_Transaction_new"></a>

### new Transaction([callback])

| Param | Type | Description |
| --- | --- | --- |
| [callback] | `function` | The transaction callback, when [running transactions with a callback function](/guides/transactions.md#transactions-with-a-callback). |

Creates a [Transaction](#Transaction) instance.

<a name="Transaction+beforeQuery"></a>

### transaction.beforeQuery(client, sql)

| Param | Type | Description |
| --- | --- | --- |
| client | `Client` | the database client that will be used to run the query. |
| sql | `SqlBricks` \| `object` \| `string` | the sql that will be sent to the database. |

Called before a query is sent to the database within a transaction. This
allows manipulating the sql if needed, even changing it entirely.

NOTE: if this method returns anything, that will be used as the sql to send
to the database instead. Therefore, this should be valid sql as expected by
[query](#Query+query).

<a name="Transaction+afterQuery"></a>

### transaction.afterQuery(client, sql, result)

| Param | Type | Description |
| --- | --- | --- |
| client | `Client` | the database client that was used to run the query. |
| sql | `SqlBricks` \| `object` \| `string` | the sql that was sent to the database to generate the result. |
| result | `object` | the result from the database. |

Called after a query is sent to the database within a transaction. This
allows manipulating the result if needed, even changing it entirely.

NOTE: if this method returns anything, that will be used as the result of
the query instead. Therefore, this should be a valid result object as
expected by [query](#Query+query).

<a name="Transaction+query"></a>

### transaction.query(sql)

| Param | Type |
| --- | --- |
| sql | `SqlBricks` \| `object` \| `string` | 

Runs a query within a transaction. This method is not implemented in

**Throws**:

- `TransactionError` if the method is not implemented.

**Knorm/knorm,**: it's meant to be implemented by a plugin that provides
database access.  
