/**
 * Creates and configures ORMs.
 */
class Knorm {
  /**
   * Creates a new ORM instance. Every ORM instance has it's own set of classes
   * and configurations, which allows creating multiple ORM's in a single
   * application.
   *
   * @param {object} [config] The ORM's configuration.
   * @param {function} config.fieldToColumn A function to convert all
   * field-names  to column names, for example
   * [snakeCase](https://lodash.com/docs/4.17.10#snakeCase).
   * @param {boolean} config.debug Whether or not to enable debug mode. See [the
   * debugging guide](/guides/debugging) for more info.
   *
   */
  constructor(config = {}) {
    this.plugins = {};
    this.models = {};
    this.config = config;

    class Field extends this.constructor.Field {}
    class Model extends this.constructor.Model {}
    class Query extends this.constructor.Query {}
    class Transaction extends this.constructor.Transaction {}

    const { fieldToColumn } = config;

    if (typeof fieldToColumn === 'function') {
      Field.prototype.getColumnName = function(fieldName) {
        return fieldToColumn.call(this, fieldName);
      };
    }

    [Field, Model, Query, Transaction].forEach(scopedClass => {
      this[scopedClass.name] = scopedClass;
      scopedClass.prototype.knorm = scopedClass.knorm = this;
    });

    [Model, Query, Transaction].forEach(scopedClass => {
      scopedClass.prototype.models = scopedClass.models = this.models;
    });

    Model.Field = Field;
    Model.Query = Query;
  }

  /**
   * Loads a plugin into the ORM.
   *
   * @param {object|function} plugin The plugin to load. If passed as a
   * function,  the function is called with the ORM instance for initialisation.
   * Note that if an object is passed, it should have `name` and `init`
   * properties.
   * @param {string} plugin.name The name of the plugin. This allows later
   * accessing the plugin via the ORM's `plugins` object. Note that for
   * functions, the plugin's `name` is the function's name.
   * @param {function} plugin.init The function called to initialise the plugin.
   *
   * @throws {KnormError} if the plugin provided is not a function or is an
   * object without an `init` method.
   * @throws {KnormError} if the plugin has no `name` property.
   * @throws {KnormError} if the plugin has already been added.
   *
   * @returns {Knorm} the ORM instance.
   */
  use(plugin) {
    if (!plugin) {
      throw new this.constructor.KnormError('no plugin provided');
    }

    if (typeof plugin !== 'function' && typeof plugin.init !== 'function') {
      throw new this.constructor.KnormError('invalid plugin provided');
    }

    const { name } = plugin;

    if (!name) {
      throw new this.constructor.KnormError('plugins should have a `name`');
    }

    if (this.plugins[name] !== undefined) {
      throw new this.constructor.KnormError(
        `plugin \`${name}\` has already been added`
      );
    }

    this.plugins[name] = plugin;

    if (plugin.init) {
      plugin.init(this);
    } else {
      plugin(this);
    }

    return this;
  }

  /**
   * Adds a model to a {@link Knorm} instance.
   *
   * @param {Model} model The model to add to the ORM. Note that models are
   * automatically added to a {@link Knorm} instance when they are configured,
   * therefore you will only need to call this method to add models that are not
   * configured. See {@link /guides/models.html#model-registry} for more info.
   *
   * @throws {KnormError} if the model passed does not inherit the ORM's
   * {@link Model} instance. This prevents one from (perhaps accidentally)
   * adding a model from ORM instance X to ORM instance Y.
   * @throws {KnormError} if the model has already been added.
   *
   * @todo return the {@link Knorm} instance.
   */
  addModel(model) {
    if (!model) {
      throw new this.constructor.KnormError(`no model provided`);
    }

    if (!(model.prototype instanceof this.Model) && model !== this.Model) {
      throw new this.constructor.KnormError(
        `model should be a subclass of \`knorm.Model\``
      );
    }

    const { name } = model;

    if (this.models[name]) {
      throw new this.constructor.KnormError(
        `model \`${name}\` has already been added`
      );
    }

    this.models[name] = model;
  }

  /**
   * Creates a clone of an existing {@link Knorm} instance, copying all the
   * models and plugins loaded into the original orm.
   *
   * @returns {Knorm} the newly cloned ORM instance.
   */
  clone() {
    const clone = new Knorm(this.config);

    Object.values(this.plugins).forEach(plugin => {
      clone.use(plugin);
    });

    Object.entries(this.models).forEach(([name, model]) => {
      clone.models[name] = model;
    });

    return clone;
  }
}

/**
 * The ORM's {@link Field} class.
 *
 * @type {Field}
 */
Knorm.prototype.Field = null;

/**
 * The ORM's {@link Model} class.
 *
 * @type {Model}
 */
Knorm.prototype.Model = null;

/**
 * The ORM's {@link Query} class.
 *
 * @type {Query}
 */
Knorm.prototype.Query = null;

/**
 * The ORM's {@link Transaction} class.
 *
 * @type {Transaction}
 */
Knorm.prototype.Transaction = null;

/**
 * A reference to the {@link Model} class.
 *
 * @type {Model}
 *
 * @private
 */
Knorm.Model = require('./Model');

/**
 * A reference to the {@link Query} class.
 *
 * @type {Query}
 *
 * @private
 */
Knorm.Query = require('./Query');

/**
 * A reference to the {@link Field} class.
 *
 * @type {Field}
 *
 * @private
 */
Knorm.Field = require('./Field');

/**
 * A reference to the {@link Transaction} class.
 *
 * @type {Transaction}
 *
 * @private
 */
Knorm.Transaction = require('./Transaction');

/**
 * A reference to the {@link KnormError} class.
 *
 * @type {KnormError}
 */
Knorm.KnormError = require('./KnormError');

module.exports = Knorm;
