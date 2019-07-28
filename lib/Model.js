const { inspect } = require('util');
const { upperFirst, camelCase, merge } = require('lodash');

const getField = (model, fieldName) => {
  return model.$config.fields.instances[fieldName];
};

const castOrParseValues = async (model, fields, castFunction) =>
  Promise.all(
    fields.map(async fieldName => {
      const field = getField(model, fieldName);

      const { name } = field;
      const value = model[name];

      if (value !== undefined && field[castFunction]) {
        const newValue = await field[castFunction](model, value);

        if (newValue !== undefined) {
          model[name] = newValue;
        }
      }
    })
  );

const removeArrayItem = (array, item) => {
  array.splice(array.indexOf(item), 1);
};

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
    const descriptors = Object.values(config.fields.instances).reduce(
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

  // TODO: pass all the query options to these methods (getData, validate, etc)?

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
      this.$config.fields.names.concat(Object.getOwnPropertyNames(this));

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
   * Sets default field values on a {@link Model} instance.
   *
   * ::: tip INFO
   * If a field's value is already set, it's not overwritten.
   * :::
   *
   * @param {object} [options] Options.
   * @param {string[]} [options.fields] A subset of fields to set values for.
   * If not passed, values are set for all fields with default values and whose
   * value is not already set.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance when the default field values are set.
   */
  async setDefaultValues({ fields } = {}) {
    fields = fields || this.$config.fields.defaulted;

    await Promise.all(
      fields.map(async fieldName => {
        const field = getField(this, fieldName);
        const { name } = field;

        if (this[name] === undefined && field.default !== undefined) {
          this[name] =
            typeof field.default === 'function'
              ? await field.default(this)
              : field.default;
        }
      })
    );

    return this;
  }

  /**
   * Validates values on a {@link Model} instance.
   *
   * @param {object} [options] Options.
   * @param {string[]} [options.fields] A subset of fields to validate. If not
   * set, all fields with a validation config are validated.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance if all field values are valid or rejected with the **first**
   * {@link ValidateError}.
   */
  async validateValues({ fields } = {}) {
    fields = fields || this.$config.fields.validated;

    await Promise.all(
      fields.map(async fieldName => {
        const field = getField(this, fieldName);

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

  /**
   * Casts values on a {@link Model} instance before data is saved to the
   * database.
   *
   * @param {object} [options] Options.
   * @param {string[]} [options.fields] A subset of fields whose values to cast.
   * If not set, values for all fields configured with a `castValue` function
   * are cast.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance when the field values are cast.
   */
  async castValues({ fields } = {}) {
    fields = fields || this.$config.fields.cast;

    await castOrParseValues(this, fields, 'castValue');

    return this;
  }

  /**
   * Parses values on a {@link Model} instance after data is fetched from the
   * database.
   *
   * @param {object} [options] Options.
   * @param {string[]} [options.fields] A subset of fields whose values to
   * parse. If not set, values for all fields configured with a `parseValue`
   * function are parsed.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance when the field values are parsed.
   */
  async parseValues({ fields } = {}) {
    fields = fields || this.$config.fields.parsed;

    await castOrParseValues(this, fields, 'parseValue');

    return this;
  }

  // TODO: refactor `forInsert` to `options.insert`
  // TODO: refactor to `executeQuery`
  // TODO: refactor this to use `Query.prototype.execute`
  getQuery(options = {}, { forInsert } = {}) {
    const query = this.constructor.query;

    query.setOptions(options).setOption('first', true);

    if (options.require === undefined) {
      query.setOption('require', true);
    }

    if (forInsert) {
      return query;
    }

    const { primary, unique } = this.$config;

    if (primary && this.$values[primary]) {
      return query.setOption('where', { [primary]: this.$values[primary] });
    }

    if (unique.length) {
      for (let index = 0; index < unique.length; index++) {
        const field = unique[index];
        const value = this.$values[field];
        if (value) {
          return query.setOption('where', { [field]: value });
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

  static addField(fieldConfig) {
    const field = new this.Field(this, fieldConfig);
    const {
      name,
      validate,
      virtual,
      column,
      primary,
      updated,
      unique,
      castValue,
      parseValue,
      methods
    } = field;

    if (typeof this.prototype[name] !== 'undefined') {
      return this.throwModelError(
        `field ${inspect(name)} conflicts with ${this.name}.prototype.${name}`
      );
    }

    const config = this.config;

    config.fields.instances[name] = field;

    config.fields.names.push(name);

    if (validate) {
      config.fields.validated.push(name);
    }

    if (!virtual) {
      config.columns[name] = column;
    }

    if (primary) {
      config.fields.primary = name;
    }

    if (updated === false) {
      config.fields.notUpdated.push(name);
    }

    if (unique) {
      config.fields.unique.push(name);
    }

    if (field.default !== undefined) {
      config.fields.defaulted.push(name);
    }

    if (castValue) {
      config.fields.cast.push(name);
    }

    if (parseValue) {
      config.fields.parsed.push(name);
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
      castValue,
      parseValue,
      methods
    } = field;
    const config = this.config;

    if (
      !config.fields.instances[name] ||
      config.fields.instances[name] !== field
    ) {
      return this.throwModelError(`unkown field ${inspect(name)}`);
    }

    delete config.fields.instances[name];

    removeArrayItem(config.fields.names, name);

    if (validate) {
      removeArrayItem(config.fields.validated, name);
    }

    if (!virtual) {
      delete config.columns[name];
    }

    if (primary) {
      config.fields.primary = undefined;
    }

    if (updated === false) {
      removeArrayItem(config.fields.notUpdated, name);
    }

    if (unique) {
      removeArrayItem(config.fields.unique, name);
    }

    if (field.default !== undefined) {
      removeArrayItem(config.fields.defaulted, name);
    }

    if (castValue) {
      removeArrayItem(config.fields.cast, name);
    }

    if (parseValue) {
      removeArrayItem(config.fields.parsed, name);
    }

    if (methods) {
      this.removeGeneratedMethods(field);
    }
  }

  static addFields(fields) {
    if (Array.isArray(fields)) {
      fields = fields.reduce((object, fieldName) => {
        object[fieldName] = {};
        return object;
      }, {});
    }

    const modelConfig = this.config;

    Object.entries(fields).forEach(([fieldName, fieldConfig]) => {
      const field = modelConfig.fields.instances[fieldName];

      if (field) {
        this.removeField(field);
      }

      // TODO: document that new classes must extend Knorm's classes
      if (fieldConfig instanceof Field) {
        fieldConfig = fieldConfig.config;
      }

      fieldConfig = Object.assign({}, fieldConfig, { name: fieldName });

      this.addField(fieldConfig);
    });
  }

  static addOptions(options) {
    // TODO: document that options are merged ie:
    // { where: { foo: 'foo' } } => { where: { foo: 'foo', bar: 'bar' } }
    // when only { where: { bar: 'bar' } } is added
    this.config.options = merge(this.config.options, options);
  }

  static getDefaultConfig() {
    const Model = this;

    return {
      Model,
      schema: undefined,
      table: undefined,
      options: { query: { debug: this.knorm.config.debug } },
      fields: {
        instances: {},
        names: [],
        validated: [],
        primary: undefined,
        unique: [],
        notUpdated: [],
        defaulted: [],
        cast: [],
        parsed: []
      },
      columns: {}
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

      this.schema = parentConfig.schema;
      this.table = parentConfig.table;
      this.addFields(parentConfig.fields.instances);
      this.addOptions(parentConfig.options);
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
    this.addFields(fields);
  }

  static get fields() {
    return this.config.fields.instances;
  }

  static set options(options) {
    this.addOptions(options);
  }

  static get options() {
    return this.config.options;
  }

  static get query() {
    return new this.Query(this).setOptions(this.config.options.query);
  }

  static get sql() {
    return new this.Sql(this);
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
Model.Sql = require('./Sql');
