const { inspect } = require('util');
const { upperFirst, camelCase, merge } = require('lodash');

/**
 * Creates model instances and allows setting, getting, validating and casting
 * data before and/or after database operations.
 */
class Model {
  /**
   * Creates a {@link Model} instance.
   *
   * @param {object} [data] Data to assign to the instance. If passed, the data
   * is set via {@link Model#setData}.
   */
  constructor(data) {
    const config = this.constructor.config;
    const descriptors = Object.values(config.fields).reduce(
      (descriptors, field) => {
        const { name, virtual, getValue, setValue } = field;

        descriptors[name] = {
          get: () => {
            if (!virtual) {
              return this.$values[name];
            }
            if (getValue) {
              return getValue(this);
            }
            return undefined;
          },
          set: value => {
            if (!virtual) {
              this.$values[name] = value;
              return;
            }
            if (setValue) {
              setValue(this, value);
            }
          }
        };

        return descriptors;
      },
      { $values: { value: {} }, $config: { value: config } }
    );

    Object.defineProperties(this, descriptors);

    if (data) {
      this.setData(data);
    }
  }

  [inspect.custom](depth, options) {
    let name = this.constructor.name;

    if (options.colors) {
      name = options.stylize(this.constructor.name, 'special');
    }

    if (depth < 0) {
      return `${name} {}`;
    }

    const data = inspect(
      this.getData(),
      Object.assign({}, options, {
        depth: options.depth === null ? null : options.depth - 1
      })
    );

    return `${name} ${data}`;
  }

  /**
   * Sets a {@link Model} instance's data.
   *
   * ::: tip INFO
   * `undefined` values are not set on the instance.
   * :::
   *
   * @param {object} data The data to assign to the instance. The keys in the
   * `data` object may be database fields, virtual fields or other arbitrary
   * keys.
   *
   * @returns {Model} The same {@link Model} instance.
   */
  setData(data) {
    Object.entries(data).forEach(([field, value]) => {
      if (value !== undefined) {
        this[field] = value;
      }
    });

    return this;
  }

  /**
   * Gets a {@link Model} instance's data.
   *
   * ::: tip INFO
   * `undefined` values are not included in the data returned.
   * :::
   *
   * @param {object} [options] Options.
   * @param {string[]} [options.fields] A subset of fields to include in the
   * returned data. If not set, all data set on the instance is returned.
   *
   * @returns {object} The data set on the {@link Model} instance.
   */
  getData({ fields } = {}) {
    fields =
      fields ||
      this.$config.fieldNames.concat(Object.getOwnPropertyNames(this));

    return fields.reduce((data, field) => {
      if (field === '$values' || field === '$config') {
        return data;
      }

      const value = this[field];

      if (value !== undefined) {
        data[field] = value;
      }

      return data;
    }, {});
  }

  /**
   * Sets default field values on the {@link Model} instance.
   *
   * ::: tip INFO
   * If a field's value is already set, it's not overwritten.
   * :::
   *
   * @param {object} [options] Options.
   * @param {string[]} [options.fields] A subset of fields to set values for.
   * If not set, all fields with default values (and whose value is not already
   * set) are set.
   *
   * @returns {Model} The same {@link Model} instance.
   */
  setDefaults({ fields } = {}) {
    fields = fields || this.$config.defaults;

    fields.forEach(field => {
      field = this.$config.fields[field];

      const { name } = field;

      if (this[name] === undefined && field.default !== undefined) {
        this[name] =
          typeof field.default === 'function'
            ? field.default(this)
            : field.default;
      }
    });

    return this;
  }

  /**
   * Validates a {@link Model} instance.
   *
   * @param {object} [options] Options.
   * @param {string[]} [options.fields] A subset of field to validate. If not
   * set, all fields with a validation config are validated.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance if all field values are valid or rejected with the **first**
   * {@link ValidateError}.
   */
  async validate({ fields } = {}) {
    fields = fields || this.$config.validated;

    await Promise.all(
      fields.map(async field => {
        field = this.$config.fields[field];

        if (typeof field.validate === 'undefined') {
          return;
        }

        const value = this[field.name];
        const validate = new this.constructor.Validate(this, field);

        return validate.validate(value, field.validate);
      })
    );

    return this;
  }

  // TODO: refactor forSave, forFetch to query options
  // TODO: indicate the options to `cast`, `validate`, `getData` are in fact
  // query options
  // TODO: move casting here, from Field
  cast({ fields, forSave, forFetch } = {}) {
    fields = fields || this.$config.fieldNames;

    fields.forEach(field => {
      field = this.$config.fields[field];

      const { name } = field;
      const value = this[name];

      if (value !== undefined) {
        const newValue = field.cast(value, this, { forSave, forFetch });
        if (newValue !== undefined) {
          this[name] = newValue;
        }
      }
    });

    return this;
  }

  // TODO: refactor `forInsert` to `options.insert`
  // TODO: refactor to `executeQuery`
  // TODO: refactor this to use `Query.prototype.execute`
  getQuery(options = {}, { forInsert } = {}) {
    const query = this.constructor.query;

    query.setOptions(options).first(true);

    if (options.require === undefined) {
      query.require(true);
    }

    if (forInsert) {
      return query;
    }

    const { primary, unique } = this.$config;

    if (primary && this.$values[primary]) {
      return query.where({ [primary]: this.$values[primary] });
    }

    if (unique.length) {
      for (let index = 0; index < unique.length; index++) {
        const field = unique[index];
        const value = this.$values[field];
        if (value) {
          return query.where({ [field]: value });
        }
      }
    }

    return this.constructor.throwModelError(
      'no primary or unique field value is set'
    );
  }

  /**
   * Inserts a single row into the database.
   *
   * @param {object} [options] {@link Query} options.
   *
   * @returns {Promise} A `Promise` that resolves with the same instance
   * populated with the inserted row from the dabatase. The fields to be
   * returned in the data can be configured with the {@link Query#fields} or
   * {@link Query#returning} options.
   */
  async insert(options) {
    const row = await this.getQuery(options, { forInsert: true }).insert(this);
    return row ? this.setData(row).cast({ forFetch: true }) : row;
  }

  /**
   * Updates a single row in the database.
   *
   * ::: warning NOTE
   * This method requires a value for either a [primary or a unique
   * field](/guides/fields.md#primary-and-unique-fields) to be set on the
   * instance in order to know what row to update.
   * :::
   *
   * ::: tip INFO
   * This method sets the {@link Query#first} (return only the first row) and
   * {@link Query#require} (throw a {@link NoRowsError} if no row is matched for
   * update) query options. However, the {@link Query#require} option can be
   * disabled via the `options` param.
   * :::
   *
   * @param {object} [options] {@link Query} options.
   *
   * @returns {Promise} A `Promise` that resolves with the same instance
   * populated with the updated row from the dabatase. The fields to be returned
   * in the data can be configured with the {@link Query#fields} or
   * {@link Query#returning} options.
   */
  async update(options) {
    const row = await this.getQuery(options).update(this);
    return row ? this.setData(row).cast({ forFetch: true }) : row;
  }

  /**
   * Either inserts or updates a single row in the database, depending on
   * whether a value for the primary field is set or not.
   *
   * @param {object} [options] {@link Query} options.
   *
   * @returns {Promise} A `Promise` that resolves with the same instance
   * populated with the inserted or updated row from the dabatase. The fields to
   * be returned in the data can be configured with the {@link Query#fields} or
   * {@link Query#returning} options.
   */
  async save(options) {
    const { primary } = this.$config;

    if (primary && this.$values[primary]) {
      return this.update(options);
    }

    return this.insert(options);
  }

  /**
   * Fetches a single row from the database.
   *
   * ::: warning NOTE
   * This method requires a value for either a [primary or a unique
   * field](/guides/fields.md#primary-and-unique-fields) to be set on the
   * instance in order to know what row to fetch.
   * :::
   *
   * ::: tip INFO
   * This method sets the {@link Query#first} (return only the first row) and
   * {@link Query#require} (throw a {@link NoRowsError} if no row is matched for
   * fetching) query options. However, the {@link Query#require} option can be
   * disabled via the `options` param.
   * :::
   *
   * @param {object} [options] {@link Query} options.
   *
   * @returns {Promise} A `Promise` that resolves with the same instance
   * populated with data fetched from the database. The fields to be returned in
   * the data can be configured with the {@link Query#fields} or
   * {@link Query#returning} options.
   */
  async fetch(options) {
    const row = await this.getQuery(options).fetch();
    return row ? this.setData(row).cast({ forFetch: true }) : row;
  }

  /**
   * Deletes a single row from the database.
   *
   * ::: warning NOTE
   * This method requires a value for either a [primary or a unique
   * field](/guides/fields.md#primary-and-unique-fields) to be set on the
   * instance in order to know what row to delete.
   * :::
   *
   * ::: tip INFO
   * This method sets the {@link Query#first} (return only the first row) and
   * {@link Query#require} (throw a {@link NoRowsError} if no row is matched for
   * deleting) query options. However, the {@link Query#require} option can be
   * disabled via the `options` param.
   * :::
   *
   * @param {object} [options] {@link Query} options.
   *
   * @returns {Promise} A `Promise` that resolves with the same instance
   * populated with the row deleted from the dabatase. The fields to be returned
   * in the data can be configured with the {@link Query#fields} or
   * {@link Query#returning} options.
   */
  async delete(options) {
    const row = await this.getQuery(options).delete();
    return row ? this.setData(row).cast({ forFetch: true }) : row;
  }

  /**
   * Inserts a single or multiple rows into the database.
   *
   * @param {Model|object|array} data The data to insert. Can be a plain object,
   * a {@link Model} instance or an array of objects or {@link Model} instances.
   * @param {object} [options] {@link Query} options
   *
   * ::: tip INFO
   * This method directly proxies to {@link Query#insert}.
   * :::
   */
  static async insert(data, options) {
    return this.query.insert(data, options);
  }

  /**
   * Updates a single or multiple rows in the database.
   *
   * @param {Model|object|array} data The data to update. Can be a plain object,
   * a {@link Model} instance or an array of objects or instances.
   * @param {object} [options] {@link Query} options
   *
   * ::: tip INFO
   * This method directly proxies to {@link Query#update}.
   * :::
   */
  static async update(data, options) {
    return this.query.update(data, options);
  }

  /**
   * Either inserts or updates a single row or multiple rows in the database.
   *
   * @param {Model|object|array} data The data to update. Can be a plain object,
   * a {@link Model} instance or an array of objects or instances.
   * @param {object} [options] {@link Query} options
   *
   * ::: tip INFO
   * This method directly proxies to {@link Query#save}.
   * :::
   */
  static async save(data, options) {
    return this.query.save(data, options);
  }

  /**
   * Fetches a single or multiple rows from the database.
   *
   * @param {object} [options] {@link Query} options
   *
   * ::: tip INFO
   * This method directly proxies to {@link Query#fetch}.
   * :::
   */
  static async fetch(options) {
    return this.query.fetch(options);
  }

  /**
   * Deletes a single or multiple rows from the database.
   *
   * @param {object} [options] {@link Query} options
   *
   * ::: tip INFO
   * This method directly proxies to {@link Query#delete}.
   * :::
   */
  static async delete(options) {
    return this.query.delete(options);
  }

  static throwModelError(message) {
    throw new this.ModelError({ message, Model: this });
  }

  static createField(fieldConfig) {
    // TODO: knorm-postgres: move the default JSON casting here

    if (fieldConfig.type === 'virtual') {
      fieldConfig = Object.assign({}, fieldConfig, { virtual: true });
    }

    return new this.Field(this, fieldConfig);
  }

  static getGeneratedMethodName(field) {
    return upperFirst(camelCase(field.name));
  }

  static getGeneratedMethodQuery(field, value, options) {
    const { name, primary, unique } = field;
    const query = this.query;

    query.setOption('where', { [name]: value });

    if (primary || unique) {
      query.setOptions({ first: true, require: true });
    }

    if (options) {
      query.setOptions(options);
    }

    return query;
  }

  static addGeneratedMethods(field) {
    const formattedName = this.getGeneratedMethodName(field);

    this[`fetchBy${formattedName}`] = async function(value, options) {
      return this.getGeneratedMethodQuery(field, value, options).fetch();
    };

    this[`updateBy${formattedName}`] = async function(value, data, options) {
      return this.getGeneratedMethodQuery(field, value, options).update(data);
    };

    this[`deleteBy${formattedName}`] = async function(value, options) {
      return this.getGeneratedMethodQuery(field, value, options).delete();
    };
  }

  static addField(field) {
    const {
      name,
      validate,
      virtual,
      column,
      primary,
      updated,
      unique,
      methods
    } = field;

    if (typeof this.prototype[name] !== 'undefined') {
      return this.throwModelError(
        `field ${inspect(name)} conflicts with ${this.name}.prototype.${name}`
      );
    }

    const config = this.config;

    config._fields[name] = field;

    config.fieldNames.push(name);

    if (validate) {
      config.validated.push(name);
    }

    if (!virtual) {
      config.columns[name] = column;
    }

    if (primary) {
      config.primary = name;
    }

    if (updated === false) {
      config.notUpdated.push(name);
    }

    if (unique) {
      config.unique.push(name);
    }

    if (field.default !== undefined) {
      config.defaults.push(name);
    }

    if (methods) {
      this.addGeneratedMethods(field);
    }
  }

  static removeGeneratedMethods(field) {
    const formattedName = this.getGeneratedMethodName(field);

    delete this[`fetchBy${formattedName}`];
    delete this[`updateBy${formattedName}`];
    delete this[`deleteBy${formattedName}`];
  }

  static removeField(field) {
    const {
      name,
      validate,
      virtual,
      primary,
      unique,
      updated,
      methods
    } = field;
    const config = this.config;

    if (!config._fields[name] || config._fields[name] !== field) {
      return this.throwModelError(`unkown field ${inspect(name)}`);
    }

    delete config._fields[name];

    config.fieldNames.splice(config.fieldNames.indexOf(name), 1);

    if (validate) {
      config.validated.splice(config.validated.indexOf(name), 1);
    }

    if (!virtual) {
      delete config.columns[name];
    }

    if (primary) {
      config.primary = undefined;
    }

    if (updated === false) {
      config.notUpdated.splice(config.notUpdated.indexOf(name), 1);
    }

    if (unique) {
      config.unique.splice(config.unique.indexOf(name), 1);
    }

    if (field.default !== undefined) {
      config.defaults.splice(config.defaults.indexOf(name), 1);
    }

    if (methods) {
      this.removeGeneratedMethods(field);
    }
  }

  static getDefaultConfig() {
    const Model = this;

    return {
      Model,
      _options: { query: { debug: this.knorm.config.debug } },
      get options() {
        return this._options;
      },
      set options(options) {
        // TODO: document that options are merged ie:
        // { where: { foo: 'foo' } } => { where: { foo: 'foo', bar: 'bar' } }
        // when only { where: { bar: 'bar' } } is added
        this._options = merge(this._options, options);
      },
      _fields: {},
      get fields() {
        return this._fields;
      },
      set fields(fields) {
        Object.entries(fields).forEach(([name, config]) => {
          if (this._fields[name]) {
            Model.removeField(this._fields[name]);
          }

          if (typeof config === 'string') {
            config = { type: config };
          }

          // TODO: document that new classes must extend Knorm's classes
          if (config instanceof Field) {
            config = config.config;
          }

          config = Object.assign({}, config, { name });

          Model.addField(Model.createField(config));
        });
      },
      fieldNames: [],
      validated: [],
      columns: {},
      primary: undefined,
      unique: [],
      notUpdated: [],
      defaults: []
    };
  }

  static setupConfig() {
    if (!this._config) {
      const config = this.getDefaultConfig();

      Object.defineProperty(this, '_config', { value: config });
    } else if (this._config.Model !== this) {
      const parentConfig = this._config;
      const childConfig = this.getDefaultConfig();

      Object.defineProperty(this, '_config', { value: childConfig });

      const { schema, table, fields, options } = parentConfig;

      if (schema) {
        childConfig.schema = schema;
      }
      if (table) {
        childConfig.table = table;
      }
      if (fields) {
        childConfig.fields = fields;
      }
      if (options) {
        childConfig.options = options;
      }
    }
  }

  static get config() {
    this.setupConfig();
    return this._config;
  }

  static set schema(schema) {
    this.config.schema = schema;
  }

  static get schema() {
    return this.config.schema;
  }

  static set table(table) {
    this.config.table = table;
  }

  static get table() {
    return this.config.table;
  }

  /**
   * As a getter, returns the fields added to the model or a model that this
   * model inherits. As a setter, sets the model's fields or overrides fields
   * added to a parent model.
   *
   * @type {object}
   */
  static set fields(fields) {
    this.config.fields = fields;
  }

  static get fields() {
    return this.config.fields;
  }

  static set options(options) {
    this.config.options = options;
  }

  static get options() {
    return this.config.options;
  }

  static get query() {
    return new this.Query(this).setOptions(this.config.options.query);
  }

  static get where() {
    return new this.Query.Where();
  }
}

/**
 * Holds a {@link Model} instance's field values for non-virtual fields. Field
 * values are set internally and should not be manipulated directly.
 *
 * @type {object}
 */
Model.prototype.$values = {};

/**
 * Holds a {@link Model} instance's reference to {@link Model.config}.
 *
 * @type {object}
 */
Model.prototype.$config = {};

/**
 * A reference to the {@link Knorm} instance.
 *
 * ::: tip
 * This is the same instance assigned to the {@link Model.knorm} static
 * property, just added as a convenience for use in instance methods.
 * :::
 *
 * @type {Knorm}
 */
Model.prototype.knorm = null;

/**
 * A reference to the {@link Knorm} instance.
 *
 * ::: tip
 * This is the same instance assigned to the {@link Model#knorm} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Knorm}
 */
Model.knorm = null;

/**
 * The model registry. This is an object containing all the models added to the
 * ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
 * for more info.
 *
 * ::: tip
 * This is the same object assigned to the {@link Model.models} static property,
 * just added as a convenience for use in instance methods.
 * :::
 *
 * @type {object}
 */
Model.prototype.models = {};

/**
 * The model registry. This is an object containing all the models added to the
 * ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
 * for more info.
 *
 * ::: tip
 * This is the same object assigned to the {@link Model#models} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {object}
 */
Model.models = {};

/**
 * For models accessed within a transaction, this is reference to the
 * {@link Transaction} instance.
 *
 * ::: warning NOTE
 * This is only set for {@link Model} instances that are accessed within a
 * transaction, otherwise it's set to `null`.
 * :::
 *
 * ::: tip
 * This is the same instance assigned to the {@link Model.transaction} static
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Transaction}
 */
Model.prototype.transaction = null;

/**
 * For models accessed within a transaction, this is reference to the
 * {@link Transaction} instance.
 *
 * ::: warning NOTE
 * This is only set for {@link Model} classes within a transaction, otherwise
 * it's set to `null`.
 * :::
 *
 * ::: tip
 * This is the same instance assigned to the {@link Model#transaction} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Transaction}
 */
Model.transaction = null;

module.exports = Model;

const Field = require('./Field');

Model.Field = Field;
Model.Query = require('./Query');
Model.Validate = require('./Model/Validate');
Model.ModelError = require('./Model/ModelError');
