import { Model } from './Model';
import { Field } from './Field';
import { Connection } from './Connection';
import { Query } from './Query';
import { Transaction } from './Transaction';
import { KnormError } from './KnormError';
import { Plugin } from './Plugin';

/**
 * An object containing the {@link Knorm} instance's model classes as values and
 * their names as keys. A model's name is derived from its class-name (i.e. its
 * `name` static property).
 */
export interface Models {
  [modelName: string]: typeof Model;
}

/**
 * An object containing the {@link Knorm} instance's plugins as values and their
 * names as keys. A model's name is derived from its class-name (i.e. its `name`
 * static property).
 */
export interface Plugins {
  [plginName: string]: Plugin;
}

export interface Config {
  /**
   * A function to convert all field-names  to column names, for example
   * [snakeCase](https://lodash.com/docs/4.17.10#snakeCase).
   */
  fieldToColumn?: (fieldName: string) => string;

  /**
   * Whether or not to enable debug mode. See [the debugging
   * guide](https://knorm.netlify.app/docs/guides/debugging) for more info.
   */
  debug?: boolean;
}

/**
 * Creates new ORMs and encapsulates their configurations.
 */
export class Knorm {
  /**
   * The {@link Knorm} instance's model registry. Stores models added via
   * {@link Knorm#addModel}.
   */
  models: Models = {};

  /**
   * The {@link Knorm} instance's plugin registry. Stores plugins added via
   * {@link Knorm#use}.
   */
  plugins: Plugins = {};

  /**
   * The {@link Knorm} instance's config. Stores config passed in via the
   * constructor.
   */
  config: Config;

  /**
   * The {@link Knorm} instance's own {@link Connection} class.
   */
  Connection: typeof Connection;

  /**
   * The {@link Knorm} instance's own {@link Model} class.
   */
  Model: typeof Model;

  /**
   * The {@link Knorm} instance's own {@link Query} class.
   */
  Query: typeof Query;

  /**
   * The {@link Knorm} instance's own {@link Field} class.
   */
  Field: typeof Field;

  /**
   * The {@link Knorm} instance's own {@link Transaction} class.
   */
  Transaction: typeof Transaction;

  /**
   * A reference to {@link Connection}.
   */
  static Connection = Connection;

  /**
   * A reference to {@link Model}.
   */
  static Model = Model;

  /**
   * A reference to {@link Query}.
   */
  static Query = Query;

  /**
   * A reference to {@link Field}.
   */
  static Field = Field;

  /**
   * A reference to {@link Transaction}.
   */
  static Transaction = Transaction;

  /**
   * A reference to {@link KnormError}.
   */
  static KnormError = KnormError;

  /**
   * A reference to {@link Plugin}.
   */
  static Plugin = Plugin;

  /**
   * Creates a new {@link Knorm} (ORM) instance. Each instance has it's own set
   * of classes and configuration, which enables having multiple {@link Knorm}
   * instances in a single application.
   *
   */
  constructor(config: Config = { debug: false }) {
    this.config = config;

    this.Field = class Field extends Knorm.Field {};
    this.Model = class Model extends Knorm.Model {};
    this.Query = class Query extends Knorm.Query {};
    this.Connection = class Connection extends Knorm.Connection {};
    this.Transaction = class Transaction extends Knorm.Transaction {};

    // TODO: move fieldToColumn to a separate plugin
    const { fieldToColumn } = this.config;
    if (typeof fieldToColumn === 'function') {
      this.Field.prototype.getColumnName = function (
        fieldName: string
      ): string {
        return fieldToColumn.call(this, fieldName);
      };
    }

    this.updateTransaction(this.Transaction);
    this.updateModel(this.Model);
    this.updateQuery(this.Query);
    this.updateField(this.Field);
    this.updateConnection(this.Connection);

    [
      this.Field,
      this.Model,
      this.Connection,
      this.Query,
      this.Transaction,
    ].forEach((scopedClass) => {
      scopedClass.prototype.knorm = scopedClass.knorm = this;
    });

    [this.Model, this.Query, this.Transaction].forEach((scopedClass) => {
      scopedClass.prototype.models = scopedClass.models = this.models;
    });
  }

  /**
   * Loads a plugin into the ORM.
   *
   * @throws {KnormError} if the plugin has already been added.
   *
   * @returns {Knorm} The same {@link Knorm} instance.
   */
  use(plugin: Plugin): Knorm {
    const { name } = plugin.constructor;

    if (this.plugins[name] !== undefined) {
      throw new KnormError(`plugin \`${name}\` has already been added`);
    }

    this.plugins[name] = plugin;
    plugin.init(this);

    return this;
  }

  /**
   * Adds a model class to a {@link Knorm} instance.
   *
   * @param {Model} model The model class to add to the ORM. Note that models
   * are automatically added to a {@link Knorm} instance when they are
   * configured, therefore you will only need to call this method to add models
   * that are not configured. See {@link /guides/models.html#model-registry} for
   * more info.
   *
   * @throws {KnormError} if the model passed does not inherit the ORM's
   * {@link Model} instance. This prevents one from (perhaps accidentally)
   * adding a model from ORM instance X to ORM instance Y.
   * @throws {KnormError} if the model has already been added.
   *
   * @returns {Knorm} The same {@link Knorm} instance.
   */
  addModel(model: typeof Model): Knorm {
    if (!model) {
      throw new KnormError(`no model provided`);
    }

    if (!(model.prototype instanceof this.Model) && model !== this.Model) {
      throw new KnormError(`model should be a subclass of \`knorm.Model\``);
    }

    const { name } = model;

    if (this.models[name]) {
      throw new KnormError(`model \`${name}\` has already been added`);
    }

    this.models[name] = model;

    return this;
  }

  /**
   * Creates a clone of an existing {@link Knorm} instance, copying all the
   * models and plugins loaded into the original instant into it.
   *
   * @returns {Knorm} The newly cloned {@link Knorm} instance.
   */
  clone(): Knorm {
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
   * Updates the {@link Knorm} instance's {@link Transaction} class, ensuring
   * all references to the new class are updated accordingly.
   *
   * @param {Transaction} transaction The new class. This should be a class that
   * extends the  current {@link Knorm#Transaction} class.
   *
   * @returns {Knorm} The same {@link Knorm} instance.
   */
  updateTransaction(transaction: typeof Transaction): Knorm {
    /**
     * The {@link Knorm} instance's {@link Transaction} class.
     */
    this.Transaction = transaction;

    return this;
  }

  /**
   * Updates the {@link Knorm} instance's {@link Model} class, ensuring all
   * references to the new class are updated accordingly.
   *
   * @param {Model} model The new class. This should be a class that extends the
   * current {@link Knorm#Model} class.
   *
   * @returns {Knorm} The same {@link Knorm} instance.
   */
  updateModel(model: typeof Model): Knorm {
    /**
     * The {@link Knorm} instance's {@link Model} class.
     */
    this.Model = model;

    return this;
  }

  /**
   * Updates the {@link Knorm} instance's {@link Field} class, ensuring all
   * references to the new class are updated accordingly.
   *
   * @param {Field} field The new class. This should be a class that extends the
   * current {@link Knorm#Field} class.
   *
   * @returns {Knorm} The same {@link Knorm} instance.
   */
  updateField(field: typeof Field): Knorm {
    /**
     * The {@link Knorm} instance's {@link Field} class.
     */
    this.Field = this.Model.Field = field;

    return this;
  }

  /**
   * Updates the {@link Knorm} instance's {@link Query} class, ensuring all
   * references to the new class are updated accordingly.
   *
   * @param {Query} query The new class. This should be a class that extends the
   * current {@link Knorm#Query} class.
   *
   * @returns {Knorm} The same {@link Knorm} instance.
   */
  updateQuery(query: typeof Query): Knorm {
    /**
     * The {@link Knorm} instance's {@link Query} class.
     */
    this.Query = this.Model.Query = query;

    return this;
  }

  /**
   * Updates the {@link Knorm} instance's {@link Connection} class, ensuring all
   * references to the new class are updated accordingly.
   *
   * @param {Connection} connection The new class. This should be a class that
   * extends the  current {@link Knorm#Connection} class.
   *
   * @returns {Knorm} The same {@link Knorm} instance.
   */
  updateConnection(connection: typeof Connection): Knorm {
    /**
     * The {@link Knorm} instance's {@link Connection} class.
     */
    this.Connection = this.Query.Connection = this.Transaction.Connection = connection;

    return this;
  }
}
