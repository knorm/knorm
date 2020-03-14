const { inspect } = require('util');
const { inspect: inspectInstance, asArray } = require('./util');
const { upperFirst, camelCase, merge } = require('lodash');

const prepareOrParseValues = async (model, fieldNames, method) => {
  const promises = [];

  for (const fieldName of fieldNames) {
    const field = model.Model.getField(fieldName);
    const value = model.getValue(fieldName);
    const fieldConfig = field.getConfig();

    method = fieldConfig[method];

    if (value === undefined || !method) {
      continue;
    }

    // TODO: what should be the order of params to FieldConfig~prepareValue?
    // TODO: what should be the order of params to FieldConfig~parseValue?

    promises.push(async () => {
      const newValue = await method(model, value);
      if (newValue !== undefined) {
        model.setValue(fieldName, newValue);
      }
    });
  }

  if (promises.length) {
    await Promise.all(promises);
  }

  return model;
};

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
   * @param {object} [values] Values to set on the instance (set via
   * {@link Model#setValues}).
   */
  constructor(values) {
    const descriptors = {
      Model: { value: this.constructor },
      $values: { value: {} }
    };

    for (const fieldName of this.constructor.config.fields.names) {
      descriptors[fieldName] = {
        set: () => {
          this.setValue(fieldName);
        },
        get: () => this.getValue(fieldName)
      };
    }

    Object.defineProperties(this, descriptors);

    if (values) {
      this.setValues(values);
    }
  }

  [inspect.custom](depth, options) {
    return inspectInstance(this, () => this.getValues(), depth, options);
  }

  setValue(fieldName, value) {
    const field = this.Model.fields[fieldName];

    if (!field) {
      this[fieldName] = value;
      return this;
    }

    const { virtual, setValue } = field.getConfig();

    if (!virtual) {
      this.$values[fieldName] = value;
      return this;
    }

    if (setValue) {
      // TODO: what should be the order of params to FieldConfig~setValue?
      setValue(this, value);
    }

    return this;
  }

  getValue(fieldName) {
    const field = this.Model.fields[fieldName];

    if (!field) {
      return this[fieldName];
    }

    const { virtual, getValue } = field.getConfig();

    if (!virtual) {
      return this.$values[fieldName];
    }

    if (getValue) {
      // TODO: what should be the order of params to FieldConfig~getValue?
      return getValue(this);
    }
  }

  /**
   * Sets values on a {@link Model} instance.
   *
   * ::: tip INFO
   * `undefined` values are not set on the instance.
   * :::
   *
   * @param {object} values The values to set on the instance. The keys in the
   * `values` object may be database fields, virtual fields or other arbitrary
   * keys.
   *
   * @returns {Model} The same {@link Model} instance.
   */
  setValues(values) {
    for (const [fieldName, value] of Object.entries(values)) {
      if (value !== undefined) {
        this.setValue(fieldName, value);
      }
    }

    return this;
  }

  // TODO: pass all the query options to these methods (getData, validate, etc)?

  /**
   * Gets values from a {@link Model} instance.
   *
   * ::: tip INFO
   * `undefined` values are not included in the object returned.
   * :::
   *
   * @param {string[]} [fieldNames] A subset of fields to include in the
   * returned object. If not set, all values set on the instance are returned,
   * including field values and other arbitrary values.
   *
   * @returns {object} The values set on the {@link Model} instance.
   */
  getValues(fieldNames) {
    if (!fieldNames) {
      fieldNames = this.Model.config.fields.names;
    }

    const values = {};

    for (const fieldName of fieldNames) {
      const value = this.getValue(fieldName);

      if (value !== undefined) {
        values[fieldName] = value;
      }
    }

    const entries = Object.entries(this);

    if (entries.length) {
      for (const [key, value] of entries) {
        values[key] = value;
      }
    }

    return values;
  }

  /**
   * Sets default field values on a {@link Model} instance.
   *
   * ::: tip INFO
   * If a field's value is already set, it's not overwritten.
   * :::
   *
   * @param {string[]} [fieldNames] A subset of fields to set values for.
   * If not passed, values are set for all fields with default values and whose
   * value is not already set.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance when the default field values are set.
   */
  async setDefaultValues(fieldNames) {
    if (!fieldNames) {
      fieldNames = this.Model.config.fields.defaulted;
    }

    const promises = [];

    for (const fieldName of fieldNames) {
      const field = this.Model.getField(fieldName);
      const value = this.getValue(fieldName);
      const { default: defaultValue } = field.getConfig();

      if (value !== undefined || defaultValue === undefined) {
        continue;
      }

      if (typeof defaultValue === 'function') {
        promises.push(async () => {
          // TODO: what should be the order of params to FieldConfig~default?
          const value = await defaultValue(this);
          this.setValue(fieldName, value);
        });
      } else {
        this.setValue(fieldName, defaultValue);
      }
    }

    if (promises.length) {
      await Promise.all(promises);
    }

    return this;
  }

  /**
   * Validates values on a {@link Model} instance.
   *
   * @param {string[]} [fieldNames] A subset of fields to validate. If not
   * set, all fields with a validation config are validated.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance if all field values are valid or rejected with the **first**
   * {@link ValidateError}.
   */
  async validateValues(fieldNames) {
    if (!fieldNames) {
      fieldNames = this.Model.config.fields.validated;
    }

    const promises = [];

    for (const fieldName of fieldNames) {
      const field = this.Model.getField(fieldName);
      const { validate: validationConfig } = field.getConfig();

      if (validationConfig === undefined) {
        continue;
      }

      const value = this.getValue(fieldName);
      // TODO: Model.Validate => Model.Validation
      // TODO: add Model.validation getter
      const validate = new this.constructor.Validate(this, field);

      promises.push(validate.validate(value, validationConfig));
    }

    if (promises.length) {
      await Promise.all(promises);
    }

    return this;
  }

  /**
   * Prepares values (e.g. type-casting) on a {@link Model} instance before data
   * is saved to the database.
   *
   * @param {string[]} [fieldNames] A subset of fields whose values to
   * prepare. If not set, values for all fields configured with a `prepareValue`
   * function are prepared.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance when the field values are prepared.
   */
  async prepareValues(fieldNames) {
    if (!fieldNames) {
      fieldNames = this.Model.config.fields.prepared;
    }

    return prepareOrParseValues(this, fieldNames, 'prepareValue');
  }

  /**
   * Parses values (e.g. type-casting) on a {@link Model} instance after data is
   * fetched from the database.
   *
   * @param {string[]} [fieldNames] A subset of fields whose values to
   * parse. If not set, values for all fields configured with a `parseValue`
   * function are parsed.
   *
   * @returns {Promise} A Promise which is resolved with the {@link Model}
   * instance when the field values are parsed.
   */
  async parseValues(fieldNames) {
    if (!fieldNames) {
      fieldNames = this.Model.config.fields.parsed;
    }

    return prepareOrParseValues(this, fieldNames, 'parseValue');
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

    const { primary, unique } = this.Model.config;

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
    return row ? this.setValues(row).cast({ forFetch: true }) : row;
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
    return row ? this.setValues(row).cast({ forFetch: true }) : row;
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
    const { primary } = this.Model.config;

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
    return row ? this.setValues(row).cast({ forFetch: true }) : row;
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
    return row ? this.setValues(row).cast({ forFetch: true }) : row;
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

  static getDefaultConfig() {
    const config = {
      Model: this,
      schema: undefined,
      table: undefined,
      fields: {
        instances: {},
        columns: {},
        names: [],
        validated: [],
        // TODO: support multiple primary fields (breaking change)
        primary: undefined,
        unique: [],
        notUpdated: [],
        defaulted: [],
        prepared: [],
        parsed: []
      },
      options: { query: {} }
    };

    config.options.query = {
      default: {
        fields: config.fields.names
      },
      fetch: {
        from: config.Model
      },
      debug: !!config.Model.knorm.config.debug
    };

    return config;
  }

  static getGeneratedMethodName(field) {
    return upperFirst(camelCase(field.getConfig().name));
  }

  static getGeneratedMethodQuery(field, value, options) {
    const { name, primary, unique } = field.getConfig();
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

  static getField(name) {
    const field = this.config.fields.instances[name];

    if (!field) {
      return this.throwModelError(`unknown field ${inspect(name)}`);
    }

    return field;
  }

  static prepareFieldConfig(fieldConfig) {
    return {
      primary: false,
      updated: true,
      unique: false,
      methods: false,
      virtual: fieldConfig.column === undefined,
      ...fieldConfig
    };
  }

  /**
   * A function to get a {@link Field}'s value from a {@link Model} instance.
   *
   * @callback fieldConfig~getValue
   * @param {Model} model The {@link Model} instance.
   *
   * @returns {*} The {@link Field}'s value.
   */

  /**
   * A function to set a {@link Field}'s value on a {@link Model} instance.
   *
   * @callback fieldConfig~setValue
   * @param {Model} model The {@link Model} instance.
   * @param {*} value The value to set.
   */

  /**
   * A function to get a {@link Field}'s default value to be set on a
   * {@link Model} instance.
   *
   * @callback fieldConfig~getDefaultValue
   * @param {Model} model The {@link Model} instance.
   *
   * @returns {*} The {@link Field}'s default value.
   */

  /**
   * A function to prepare a {@link Field}'s value before it's saved to the
   * database.
   *
   * @callback fieldConfig~prepareValue
   * @param {Model} model The {@link Model} instance.
   * @param {*} value The {@link Field}'s value before it's prepared.
   *
   * @returns {*} The prepared value.
   */

  /**
   * A function to parse a {@link Field}'s value after it's fetched from the
   * database.
   *
   * @callback fieldConfig~parseValue
   * @param {Model} model The {@link Model} instance.
   * @param {*} value The {@link Field}'s value before it's parsed.
   *
   * @returns {*} The parsed value.
   */

  /**
   * Adds a {@link Field} to a {@link ModelClass}.
   *
   * @param {object} fieldConfig The field's config.
   * @param {string} fieldConfig.name The field's name.
   * @param {boolean} [fieldConfig.virtual=false] Whether or not the field is a
   * virtual field. A virtual field is any field that does not map to a column
   * on the database, whereas a database field is one that does.
   * @param {fieldConfig~getValue} [fieldConfig.getValue] A function to get the
   * field's value from a {@link Model} instance, ideally for virtual fields.
   * @param {fieldConfig~setValue} [fieldConfig.setValue] A function to set the
   * field's  value on a {@link Model} instance, ideally virtual fields.
   * @param {*|fieldConfig~getDefaultValue} [fieldConfig.default] The field's
   * default value. This could also be a {@link fieldConfig~getDefaultValue}
   * function that returns the field's default value.
   * @param {string} [fieldConfig.column] The field's column-name. This is only
   * used for database (non-virtual) fields.
   * @param {boolean} [fieldConfig.primary=false] Whether or not the field is a
   * primary field. This is only used for database (non-virtual) fields.
   * @param {boolean} [fieldConfig.unique=false] Whether or not the field is a
   * unique field. This is only used for database (non-virtual) fields.
   * @param {boolean} [fieldConfig.updated=true] Whether or not the field should
   * be updated in {@link Query#update} queries. This is only used for database
   * (non-virtual) fields.
   * @param {boolean} [fieldConfig.methods=false] Whether or not static
   * `fetchByFieldName`, `updateByFieldName` and `deleteByFieldName` methods
   * should be created for the field. See the
   * [field guide](/guides/fields#generated-methods) for more information.
   * @param {object} [fieldConfig.validate] An object defining validators to use
   * to validate the field's value. See {@link Validate#validate} for more info.
   * @param {fieldConfig~prepareValue} [fieldConfig.prepareValue] A function to
   * prepare the field's value before it's saved to the database.
   * @param {fieldConfig~parseValue} [fieldConfig.parseValue] A function to
   * parse the field's value after it's fetched from the database.
   */
  static addField(fieldConfig) {
    // TODO: document that existing field is removed first
    // TODO: document that an error is thrown for this.prototype[fieldConfig.name]
    // conflicts
    fieldConfig = this.prepareFieldConfig(fieldConfig);

    const {
      name,
      validate,
      column,
      primary,
      updated,
      unique,
      prepareValue,
      parseValue,
      methods
    } = fieldConfig;

    if (typeof this.prototype[name] !== 'undefined') {
      return this.throwModelError(
        `field ${inspect(name)} conflicts with ${this.name}.prototype.${name}`
      );
    }

    const config = this.config;
    const existingField = config.fields.instances[name];

    if (existingField) {
      this.removeField(existingField);
    }

    const field = this.field.setConfig(fieldConfig);

    config.fields.instances[name] = field;

    if (column) {
      config.fields.columns[name] = column;
    }

    config.fields.names.push(name);

    if (validate) {
      config.fields.validated.push(name);
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

    if (fieldConfig.default !== undefined) {
      config.fields.defaulted.push(name);
    }

    if (prepareValue) {
      config.fields.prepared.push(name);
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
      column,
      primary,
      unique,
      updated,
      prepareValue,
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

    if (column) {
      delete config.fields.columns[name];
    }

    removeArrayItem(config.fields.names, name);

    if (validate) {
      removeArrayItem(config.fields.validated, name);
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

    if (prepareValue) {
      removeArrayItem(config.fields.prepared, name);
    }

    if (parseValue) {
      removeArrayItem(config.fields.parsed, name);
    }

    if (methods) {
      this.removeGeneratedMethods(field);
    }
  }

  static addFields(fields) {
    for (const field of asArray(fields)) {
      if (typeof field === 'string') {
        this.addField({ name: field });
        // TODO: document that new classes must extend Knorm's classes
      } else if (field instanceof Field) {
        this.addField(field.getConfig());
      } else if (typeof field === 'object') {
        for (const [name, config] of Object.entries(field)) {
          if (typeof config === 'string') {
            this.addField({ name, type: config });
            // TODO: document that new classes must extend Knorm's classes
          } else if (config instanceof Field) {
            this.addField({ ...config.getConfig(), name });
          } else if (typeof field === 'object') {
            this.addField({ ...config, name });
          } else {
            this.throwModelError(
              `invalid field config ${inspect(config)} for field ${inspect(
                name
              )}`
            );
          }
        }
      } else {
        this.throwModelError(`invalid fields config ${inspect(fields)}`);
      }
    }
  }

  static addOptions(options) {
    // TODO: document that options are merged ie:
    // { where: { foo: 'foo' } } => { where: { foo: 'foo', bar: 'bar' } }
    // when only { where: { bar: 'bar' } } is added
    // TODO: document that default options can be overriden (e.g. `from` and
    // `fields`)
    this.config.options = merge(this.config.options, options);
  }

  static setupConfig() {
    if (!this.$config) {
      const config = this.getDefaultConfig();

      Object.defineProperty(this, '$config', { value: config });
    } else if (this.$config.Model !== this) {
      const parentConfig = this.$config;
      const childConfig = this.getDefaultConfig();

      Object.defineProperty(this, '$config', { value: childConfig });

      this.schema = parentConfig.schema;
      this.table = parentConfig.table;
      this.fields = parentConfig.fields.instances;
      this.options = merge({}, parentConfig.options, childConfig.options);
    }
  }

  static get config() {
    this.setupConfig();

    return this.$config;
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

  static get columns() {
    return this.config.fields.columns;
  }

  static set options(options) {
    this.addOptions(options);
  }

  static get options() {
    return this.config.options;
  }

  static getPluginOptions(plugin) {
    if (typeof plugin === 'object') {
      plugin = plugin.name;
    }

    return this.options.plugins[plugin];
  }

  static get query() {
    const query = new this.Query(this);
    const {
      fetch: fetchOptions,
      insert: insertOptions,
      update: updateOptions,
      delete: deleteOptions,
      default: defaultOptions,
      ...otherOptions
    } = this.config.options.query;

    if (fetchOptions) {
      query.setMethodOptions('fetch', fetchOptions);
    }
    if (insertOptions) {
      query.setMethodOptions('insert', insertOptions);
    }
    if (updateOptions) {
      query.setMethodOptions('update', updateOptions);
    }
    if (deleteOptions) {
      query.setMethodOptions('delete', deleteOptions);
    }

    query.setDefaultOptions(defaultOptions);
    query.setOptions(otherOptions);

    return query;
  }

  static get field() {
    return new this.Field(this);
  }

  static get sql() {
    return new this.Sql(this);
  }

  static get queryOptions() {
    return new this.QueryOptions(this);
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
Model.QueryOptions = require('./QueryOptions');
Model.Validate = require('./Model/Validate');
Model.ModelError = require('./Model/ModelError');
Model.Sql = require('./Sql');
