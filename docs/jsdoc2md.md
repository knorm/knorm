## Classes

<dl>
<dt><a href="#Knorm">Knorm</a></dt>
<dd><p>Knorm</p>
</dd>
<dt><a href="#Model">Model</a></dt>
<dd><p>Model</p>
</dd>
</dl>

<a name="Knorm"></a>

## Knorm
Knorm


* [Knorm](#Knorm)
    * [new Knorm([config])](#new_Knorm_new)
    * _instance_
        * [.use(plugin)](#Knorm+use) ⇒ [`Knorm`](#Knorm)
    * _static_
        * [.Model](#Knorm.Model) : [`Model`](#Model)
        * [.Query](#Knorm.Query) : <code>Query</code>
        * [.Field](#Knorm.Field) : <code>Field</code>
        * [.Transaction](#Knorm.Transaction) : <code>Transaction</code>
        * [.KnormError](#Knorm.KnormError) : <code>KnormError</code>

<a name="new_Knorm_new"></a>

### new Knorm([config])
Create a new ORM instance.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [config] | <code>object</code> | <code>{}</code> | ORM configuration. |
| config.fieldToColumn | <code>function</code> |  | A function to convert all field-names to column names, for example [snakeCase](https://lodash.com/docs/4.17.10#snakeCase). |
| config.debug | <code>boolean</code> |  | Whether or not to enable debug mode. |

<a name="Knorm+use"></a>

### knorm.use(plugin) ⇒ [`Knorm`](#Knorm)
Load a plugin into the ORM.


| Param | Type | Description |
| --- | --- | --- |
| plugin | <code>object</code> \| <code>function</code> | The plugin to load. If passed as a function, the function is called with the ORM instance for initialisation. If passed as an object, it should have `name` and `init` properties. |
| plugin.name | <code>string</code> | The name of the plugin. This allows later accessing the plugin via `orm.plugins['plugin name']`. |
| plugin.init | <code>function</code> | The function called to initialise the plugin. |

**Returns**: [`Knorm`](#Knorm) - The ORM instance.  
<a name="Knorm.Model"></a>

### Knorm.Model : [`Model`](#Model)
Reference to the Model class

<a name="Knorm.Query"></a>

### Knorm.Query : <code>Query</code>
Reference to the Query class

<a name="Knorm.Field"></a>

### Knorm.Field : <code>Field</code>
Reference to the Field class

<a name="Knorm.Transaction"></a>

### Knorm.Transaction : <code>Transaction</code>
Reference to the Transaction class

<a name="Knorm.KnormError"></a>

### Knorm.KnormError : <code>KnormError</code>
Reference to the KnormError class

<a name="Model"></a>

## Model
Model

