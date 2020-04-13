/**
 * Creates and configures ORMs.
 */
class Knorm {
  /**
   * Creates a new {@link Knorm} (ORM) instance. Each instance has it's own set
   * of classes and configuration, which enables having multiple {@link Knorm}
   * instances in a single application.
   *
   * @param {object} [config] The ORM's configuration.
   * @param {function} [config.fieldToColumn] A function to convert all
   * field-names  to column names, for example
   * [snakeCase](https://lodash.com/docs/4.17.10#snakeCase).
   * @param {boolean} [config.debug] Whether or not to enable debug mode. See
   * [the debugging guide](/guides/debugging) for more info.
   *
   */
  constructor(config = {}) {
    /**
     * The {@link Knorm} instance's model registry. Stores models added via
     * {@link Knorm#addModel}.
     *
     * @type {object}
     */
    this.models = {};

    /**
     * The {@link Knorm} instance's plugin registry. Stores plugins added via
     * {@link Knorm#use}.
     *
     * @type {object}
     */
    this.plugins = {};

    /**
     * The {@link Knorm} instance's config. Stores config passed in via the
     * constructor.
     *
     * @type {object}
     */
    this.config = config;

    class Field extends this.constructor.Field {}
    class Model extends this.constructor.Model {}
    class Query extends this.constructor.Query {}
    class Connection extends this.constructor.Connection {}
    class Transaction extends this.constructor.Transaction {}

    // TODO: move fieldToColumn to a separate plugin
    const { fieldToColumn } = config;
    if (typeof fieldToColumn === 'function') {
      Field.prototype.getColumnName = function (fieldName) {
        return fieldToColumn.call(this, fieldName);
      };
    }

    this.updateTransaction(Transaction);
    this.updateModel(Model);
    this.updateQuery(Query);
    this.updateField(Field);
    this.updateConnection(Connection);

    [Field, Model, Connection, Query, Transaction].forEach((scopedClass) => {
      scopedClass.prototype.knorm = scopedClass.knorm = this;
    });

    [Model, Query, Transaction].forEach((scopedClass) => {
      scopedClass.prototype.models = scopedClass.models = this.models;
    });
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
   * @param {Model} Model The model to add to the ORM. Note that models are
   * automatically added to a {@link Knorm} instance when they are configured,
   * therefore you will only need to call this method to add models that are not
   * configured. See {@link /guides/models.html#model-registry} for more info.
   *
   * @throws {KnormError} if the model passed does not inherit the ORM's
   * {@link Model} instance. This prevents one from (perhaps accidentally)
   * adding a model from ORM instance X to ORM instance Y.
   * @throws {KnormError} if the model has already been added.
   *
   * @returns {Knorm} The same {@link Knorm} instance to allow chaining.
   */
  addModel(Model) {
    if (!Model) {
      throw new this.constructor.KnormError(`no model provided`);
    }

    if (!(Model.prototype instanceof this.Model) && Model !== this.Model) {
      throw new this.constructor.KnormError(
        `model should be a subclass of \`knorm.Model\``
      );
    }

    const { name } = Model;

    if (this.models[name]) {
      throw new this.constructor.KnormError(
        `model \`${name}\` has already been added`
      );
    }

    this.models[name] = Model;

    return this;
  }

  /**
   * Creates a clone of an existing {@link Knorm} instance, copying all the
   * models and plugins loaded into the original orm into it.
   *
   * @returns {Knorm} The newly cloned {@link Knorm} instance.
   */
  clone() {
    const clone = new Knorm(this.config);

    Object.values(this.plugins).forEach((plugin) => {
      clone.use(plugin);
    });

    Object.entries(this.models).forEach(([name, model]) => {
      clone.models[name] = model;
    });

    return clone;
  }

  /**
   * Updates the {@link Transaction} class used in the {@link Knorm} instance.
   * This  ensures all references to the new class are updated accordingly.
   *
   * @param {Transaction} Transaction The new class. This could be a class that
   * extends the  current {@link Knorm#Transaction} class or an entirely new
   * class.
   *
   * @returns {Knorm} The same {@link Knorm} instance to allow chaining.
   */
  updateTransaction(Transaction) {
    /**
     * The {@link Knorm} instance's {@link Transaction} class.
     *
     * @type {Transaction}
     */
    this.Transaction = Transaction;

    return this;
  }

  /**
   * Updates the {@link Model} class used in the {@link Knorm} instance. This
   * ensures all references to the new class are updated accordingly.
   *
   * @param {Model} Model The new class. This could be a class that extends the
   * current {@link Knorm#Model} class or an entirely new class.
   *
   * @returns {Knorm} The same {@link Knorm} instance to allow chaining.
   */
  updateModel(Model) {
    /**
     * The {@link Knorm} instance's {@link Model} class.
     *
     * @type {Model}
     */
    this.Model = Model;

    return this;
  }

  /**
   * Updates the {@link Field} class used in the {@link Knorm} instance. This
   * ensures all references to the new class are updated accordingly.
   *
   * @param {Field} Field The new class. This could be a class that extends the
   * current {@link Knorm#Field} class or an entirely new class.
   *
   * @returns {Knorm} The same {@link Knorm} instance to allow chaining.
   */
  updateField(Field) {
    /**
     * The {@link Knorm} instance's {@link Field} class.
     *
     * @type {Field}
     */
    this.Field = this.Model.Field = Field;

    return this;
  }

  /**
   * Updates the {@link Query} class used in the {@link Knorm} instance. This
   * ensures all references to the new class are updated accordingly.
   *
   * @param {Query} Query The new class. This could be a class that extends the
   * current {@link Knorm#Query} class or an entirely new class.
   *
   * @returns {Knorm} The same {@link Knorm} instance to allow chaining.
   */
  updateQuery(Query) {
    /**
     * The {@link Knorm} instance's {@link Query} class.
     *
     * @type {Query}
     */
    this.Query = this.Model.Query = Query;

    return this;
  }

  /**
   * Updates the {@link Connection} class used in the {@link Knorm} instance.
   * This  ensures all references to the new class are updated accordingly.
   *
   * @param {Connection} Connection The new class. This could be a class that
   * extends the  current {@link Knorm#Connection} class or an entirely new
   * class.
   *
   * @returns {Knorm} The same {@link Knorm} instance to allow chaining.
   */
  updateConnection(Connection) {
    /**
     * The {@link Knorm} instance's {@link Connection} class.
     *
     * @type {Connection}
     */
    this.Connection = this.Query.Connection = this.Transaction.Connection = Connection;

    return this;
  }
}

module.exports = Knorm;

/**
 * A reference to {@link Connection}.
 *
 * @type {Connection}
 *
 * @private
 */
Knorm.Connection = require('./Connection');

/**
 * A reference to {@link Model}.
 *
 * @type {Model}
 *
 * @private
 */
Knorm.Model = require('./Model');

/**
 * A reference to {@link Query}.
 *
 * @type {Query}
 *
 * @private
 */
Knorm.Query = require('./Query');

/**
 * A reference to {@link Field}.
 *
 * @type {Field}
 *
 * @private
 */
Knorm.Field = require('./Field');

/**
 * A reference to {@link Transaction}.
 *
 * @type {Transaction}
 *
 * @private
 */
Knorm.Transaction = require('./Transaction');

/**
 * A reference to {@link KnormError}.
 *
 * @type {KnormError}
 */
Knorm.KnormError = require('./KnormError');
