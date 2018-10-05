## Classes

<dl>
<dt><a href="#Knorm">Knorm</a></dt>
<dd><p>Creates and configures ORMs.</p>
</dd>
<dt><a href="#Model">Model</a></dt>
<dd><p>Base class for all models.</p>
</dd>
</dl>

<a name="Knorm"></a>

## Knorm
Creates and configures ORMs.


* [Knorm](#Knorm)
    * [new Knorm([config])](#new_Knorm_new)
    * _instance_
        * [.use(plugin)](#Knorm+use) ⇒ [Knorm](#Knorm)
        * [.addModel(model)](#Knorm+addModel)
        * [.clone()](#Knorm+clone) ⇒ [Knorm](#Knorm)
    * _static_
        * [.Model](#Knorm.Model) : [Model](#Model)
        * [.Query](#Knorm.Query) : `Query`
        * [.Field](#Knorm.Field) : `Field`
        * [.Transaction](#Knorm.Transaction) : `Transaction`
        * [.KnormError](#Knorm.KnormError) : `KnormError`

<a name="new_Knorm_new"></a>

### new Knorm([config])
Creates a new ORM instance.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [config] | `object` | <code>{}</code> | The ORM's configuration. |
| config.fieldToColumn | `function` |  | A function to convert all field-names  to column names, for example [snakeCase](https://lodash.com/docs/4.17.10#snakeCase). |
| config.debug | `boolean` |  | Whether or not to enable debug mode. |

<a name="Knorm+use"></a>

### knorm.use(plugin) ⇒ [Knorm](#Knorm)
Loads a plugin into the ORM.

**Throws**:

- `KnormError` if the plugin provided is not a function or is an
object without an `init` method.
- `KnormError` if the plugin has no `name` property.
- `KnormError` if the plugin has already been added.


| Param | Type | Description |
| --- | --- | --- |
| plugin | `object` \| `function` | The plugin to load. If passed as a function,  the function is called with the ORM instance for initialisation. Note that if an object is passed, it should have `name` and `init` properties. |
| plugin.name | `string` | The name of the plugin. This allows later accessing the plugin via the ORM's `plugins` object. Note that for functions, the plugin's `name` is the function's name. |
| plugin.init | `function` | The function called to initialise the plugin. |

**Returns**: [Knorm](#Knorm) - the ORM instance.  
<a name="Knorm+addModel"></a>

### knorm.addModel(model)
Adds a model to a [Knorm](#Knorm) instance.

**Throws**:

- `KnormError` if the model passed does not inherit the ORM's
[Model](#Model) instance. This prevents one from (perhaps accidentally)
adding a model from ORM instance X to ORM instance Y.
- `KnormError` if the model has already been added.

**Todo**

- [ ] return the [Knorm](#Knorm) instance.


| Param | Type | Description |
| --- | --- | --- |
| model | [Model](#Model) | The model to add to the ORM. Note that models are automatically added to a [Knorm](#Knorm) instance when they are configured, therefore you will only need to call this method to add models that are not configured. See [/guides/models.html#model-registry](/guides/models.html#model-registry) for more info. |

<a name="Knorm+clone"></a>

### knorm.clone() ⇒ [Knorm](#Knorm)
Creates a clone of an existing [Knorm](#Knorm) instance, copying all the
models and plugins loaded into the original orm.

**Returns**: [Knorm](#Knorm) - the newly cloned ORM instance.  
<a name="Knorm.Model"></a>

### Knorm.Model : [Model](#Model)
Reference to the [Model](#Model) class.

<a name="Knorm.Query"></a>

### Knorm.Query : `Query`
Reference to the [Query](Query) class.

<a name="Knorm.Field"></a>

### Knorm.Field : `Field`
Reference to the [Field](Field) class.

<a name="Knorm.Transaction"></a>

### Knorm.Transaction : `Transaction`
Reference to the [Transaction](Transaction) class.

<a name="Knorm.KnormError"></a>

### Knorm.KnormError : `KnormError`
Reference to the [KnormError](KnormError) class.

<a name="Model"></a>

## Model
Base class for all models.

