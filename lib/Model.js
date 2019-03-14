const { upperFirst, merge } = require('lodash');

/**
 * Creates model instances and allows setting, getting, validating and casting
 * data before and/or after database operations.
 */
class Model {
  /**
   * Creates a {@link Model} instance.
   *
   * @param {object} [data] Data to assign to the instance. This data can be
   * anything: data for fields (including virtual fields) or any arbitrary data.
   * If data is provided, it's set via {@link Model#setData}.
   */
  constructor(data = {}) {
    const config = this.constructor.config;
    const unique = config.unique;
    const fields = config.fields;
    const virtuals = config.virtuals;
    const descriptors = Object.values(virtuals).reduce(
      (descriptors, virtual) => {
        const { name, get, set } = virtual;
        descriptors[name] = { get, set, enumerable: true };
        return descriptors;
      },
      {}
    );

    descriptors._config = { value: { config, unique, fields, virtuals } };
    Object.defineProperties(this, descriptors);

    this.setData(data);
  }

  // TODO: strict mode: throw if the field-name is not a valid field
  getField(field) {
    return this._config.fields[field];
  }

  // TODO: strict mode: throw if the field-name is not a valid field
  getFields(fields) {
    if (!fields || !fields.length) {
      return Object.values(this._config.fields);
    }

    return fields.map(field => {
      if (typeof field === 'string') {
        return this.getField(field);
      }
      return field;
    });
  }

  // TODO: v2: make async
  setDefaults({ fields } = {}) {
    this.getFields(fields).forEach(field => {
      const name = field.name;

      if (this[name] === undefined) {
        const defaultValue = field.getDefault(this);
        if (defaultValue !== undefined) {
          this[name] = defaultValue;
        }
      }
    });

    return this;
  }

  /**
   * Sets an instance's data.
   *
   * ::: tip INFO
   * - Keys with `undefined` values are skipped.
   * - Virtuals with no setters are skipped.
   * :::
   *
   * @param {object} data The data to assign to the instance. This could contain
   * anything, including field values (including virtual fields) and other
   * arbitrary data.
   *
   * @returns {Model} The same model instance
   *
   * @todo strict mode: throw if a virtual has no setter
   * @todo strict mode: check if all fields in the data are valid field names
   */
  setData(data) {
    const virtuals = this._config.virtuals;

    Object.entries(data).forEach(([key, value]) => {
      if (virtuals[key] && !virtuals[key].set) {
        return;
      }

      if (value !== undefined) {
        this[key] = value;
      }
    });

    return this;
  }

  getFieldData({ fields } = {}) {
    return this.getFields(fields).reduce((data, field) => {
      const name = field.name;
      const value = this[name];

      if (value !== undefined) {
        data[name] = value;
      }

      return data;
    }, {});
  }

  _getVirtualGetters(virtuals) {
    if (!virtuals || !virtuals.length) {
      virtuals = Object.values(this._config.virtuals)
        .filter(virtual => !!virtual.get)
        .map(virtual => virtual.name);
    }

    return virtuals;
  }

  // TODO: return `undefined` if a virtual has no getter instead of throwing (but throw in strict mode)
  // TODO: strict mode: throw if the virtual-name is not a valid virtual
  _getVirtualData(name) {
    const virtual = this._config.virtuals[name];

    if (!virtual.get) {
      throw new Error(
        `Virtual '${this.constructor.name}.${name}' has no getter`
      );
    }

    return virtual.get.call(this);
  }

  async getVirtualData({ virtuals } = {}) {
    virtuals = this._getVirtualGetters(virtuals);

    const data = {};

    await Promise.all(
      virtuals.map(async name => {
        data[name] = await this._getVirtualData(name);
      })
    );

    return data;
  }

  _isPromise(value) {
    return typeof value === 'object' && typeof value.then === 'function';
  }

  getVirtualDataSync({ virtuals } = {}) {
    virtuals = this._getVirtualGetters(virtuals);

    return virtuals.reduce((data, name) => {
      const value = this._getVirtualData(name);

      if (!this._isPromise(value)) {
        data[name] = value;
      }

      return data;
    }, {});
  }

  async getData({ fields, virtuals } = {}) {
    const fieldData = this.getFieldData({ fields });
    const virtualData = await this.getVirtualData({ virtuals });

    return Object.assign(fieldData, virtualData);
  }

  getDataSync({ fields, virtuals } = {}) {
    const fieldData = this.getFieldData({ fields });
    const virtualData = this.getVirtualDataSync({ virtuals });

    return Object.assign(fieldData, virtualData);
  }

  async validate({ fields } = {}) {
    await Promise.all(
      this.getFields(fields).map(async field => {
        const name = field.name;
        const value = this[name];
        await field.validate(value, this);
      })
    );

    return this;
  }

  // TODO: v2: make async
  cast({ fields, forSave, forFetch } = {}) {
    this.getFields(fields).forEach(field => {
      const name = field.name;
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

  getQuery(options = {}, { forInsert } = {}) {
    const query = this.constructor.query;

    query.setOptions(options).first(true);

    if (options.require === undefined) {
      query.require(true);
    }

    if (forInsert) {
      return query;
    }

    const primaryField = this._config.config.primary;
    const primaryFieldValue = this[primaryField];

    if (primaryFieldValue !== undefined) {
      return query.where({ [primaryField]: primaryFieldValue });
    }

    const uniqueFields = this._config.unique;
    if (uniqueFields.length) {
      const uniqueFieldAdded = uniqueFields.some(field => {
        const value = this[field];
        if (value !== undefined) {
          query.where({ [field]: value });
          return true;
        }
        return false;
      });
      if (uniqueFieldAdded) {
        return query;
      }
    }

    throw new Error(
      `${this.constructor.name}: primary field (\`${primaryField}\`) is not set`
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
   *
   * @todo throw {@link ModelError} instead of plain `Error`
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
   *
   * @todo throw {@link ModelError} instead of plain `Error`
   */
  async save(options) {
    return this[this._config.config.primary] === undefined
      ? this.insert(options)
      : this.update(options);
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
   *
   * @todo throw {@link ModelError} instead of plain `Error`
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
   *
   * @todo throw {@link ModelError} instead of plain `Error`
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

  // depeded on by knorm-relations
  static addField(field) {
    const { name } = field;

    if (this.prototype[name] !== undefined) {
      throw new Error(
        `${this.name}: cannot add field \`${name}\` ` +
          `(\`${this.name}.prototype.${name}\` is already assigned)`
      );
    }
    if (this._config._virtuals[name] !== undefined) {
      throw new Error(
        `${this.name}: cannot add field \`${name}\` ` +
          `(\`${name}\` is a virtual)`
      );
    }

    if (field.primary) {
      this._config._primary = name;
    } else if (this._config._primary === name) {
      this._config._primary = undefined;
    }

    if (field.updated === false) {
      this._config.notUpdated.push(name);
    } else {
      const index = this._config.notUpdated.indexOf(name);
      if (index > -1) {
        this._config.notUpdated.splice(index, 1);
      }
    }

    if (field.unique) {
      this._config.unique.push(name);
    } else {
      const index = this._config.unique.indexOf(name);
      if (index > -1) {
        this._config.unique.splice(index, 1);
      }
    }

    if (field.methods) {
      const formattedName = upperFirst(name);

      this[`fetchBy${formattedName}`] = async function(value, options) {
        // eslint-disable-next-line new-cap
        return new this({ [name]: value }).fetch(options);
      };

      this[`updateBy${formattedName}`] = async function(value, data, options) {
        data = Object.assign({}, data, { [name]: value });
        // eslint-disable-next-line new-cap
        return new this(data).update(options);
      };

      this[`deleteBy${formattedName}`] = async function(value, options) {
        // eslint-disable-next-line new-cap
        return new this({ [name]: value }).delete(options);
      };
    }

    if (!this._config.fieldNames.includes(name)) {
      this._config.fieldNames.push(name);
    }
    this._config._fields[name] = field;
    this._config.fieldsToColumns[name] = field.column;
  }

  // depended on by knorm-relations
  static removeField(field) {
    const { name, methods, primary, unique } = field;

    if (!this._config._fields[name]) {
      return;
    }

    if (this._config._primary === name) {
      this._config._primary = undefined;
    }

    // we use `delete` because it's easier to work with and we don't care about
    // performance here. it's expected that `removeField` is called syncronously
    // when the server is starting up
    delete this._config._fields[name];
    delete this._config.fieldsToColumns[name];

    const notUpdatedIndex = this._config.notUpdated.indexOf(name);
    if (notUpdatedIndex > -1) {
      this._config.notUpdated.splice(notUpdatedIndex, 1);
    }

    const uniqueIndex = this._config.unique.indexOf(name);
    if (uniqueIndex > -1) {
      this._config.unique.splice(uniqueIndex, 1);
    }

    const fieldNameIndex = this._config.fieldNames.indexOf(name);
    if (fieldNameIndex > -1) {
      this._config.fieldNames.splice(fieldNameIndex, 1);
    }

    if (methods && (primary || unique)) {
      const formattedName = upperFirst(name);
      delete this[`fetchBy${formattedName}`];
      delete this[`updateBy${formattedName}`];
      delete this[`deleteBy${formattedName}`];
    }
  }

  static addVirtual(virtual) {
    const { name } = virtual;

    if (this.prototype[name] !== undefined) {
      throw new Error(
        `${this.name}: cannot add virtual \`${name}\` ` +
          `(\`${this.name}.prototype.${name}\` is already assigned)`
      );
    }

    if (this.config._fields[name] !== undefined) {
      throw new Error(
        `${this.name}: cannot add virtual \`${name}\` ` +
          `(\`${name}\` is a field)`
      );
    }

    this._config._virtuals[name] = virtual;
  }

  // depeded on by knorm-relations
  static createConfig() {
    const model = this;

    const config = {
      model,
      _fields: {},
      _virtuals: {},
      _options: {},
      fieldsToColumns: {},
      unique: [],
      notUpdated: [],
      fieldNames: []
    };

    Object.defineProperties(config, {
      primary: {
        get() {
          if (!config._primary) {
            throw new Error(`\`${model.name}\` has no primary field`);
          }
          return config._primary;
        }
      },
      fields: {
        get() {
          return config._fields;
        },
        set(fields) {
          Object.entries(fields).forEach(([name, config]) => {
            if (typeof config === 'string') {
              config = { type: config };
            }

            if (config instanceof model.Field) {
              config = Object.assign({}, config.config, { model });
            } else {
              config = Object.assign({}, config, { name, model });
            }

            model.addField(new model.Field(config));
          });
        }
      },
      virtuals: {
        get() {
          return config._virtuals;
        },
        set(virtuals) {
          Object.entries(virtuals).forEach(([name, descriptor]) => {
            model.addVirtual(new model.Virtual({ name, model, descriptor }));
          });
        }
      },
      options: {
        get() {
          return config._options;
        },
        set(options) {
          config._options = merge(config._options, options);
        }
      }
    });

    return config;
  }

  // TODO: document `Model.config = {}` for models that inherit others but have
  // no config

  static set config({ schema, table, fields, virtuals, options }) {
    if (!this._config) {
      const value = this.createConfig();
      Object.defineProperty(this, '_config', { value, writable: true });
    } else if (this._config.model !== this) {
      const parentConfig = this._config;
      this._config = this.createConfig();
      this._config.schema = parentConfig.schema;
      this._config.table = parentConfig.table;
      this._config.fields = parentConfig._fields;
      this._config.virtuals = parentConfig._virtuals;
      this._config.options = parentConfig._options;
    }

    if (!this.knorm.models[this.name]) {
      this.knorm.addModel(this);
    }

    if (schema) {
      this._config.schema = schema;
    }

    if (table) {
      this._config.table = table;
    }

    if (fields) {
      this._config.fields = fields;
    }

    if (virtuals) {
      this._config.virtuals = virtuals;
    }

    if (options) {
      this._config.options = options;
    }
  }

  static get config() {
    return this._config;
  }

  static set schema(schema) {
    this.config = { schema };
  }

  static get schema() {
    return this.config.schema;
  }

  static set table(table) {
    this.config = { table };
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
    this.config = { fields };
  }

  static get fields() {
    return this.config.fields;
  }

  static set virtuals(virtuals) {
    this.config = { virtuals };
  }

  static get virtuals() {
    return this.config.virtuals;
  }

  static set options(options) {
    this.config = { options };
  }

  static get options() {
    return this.config.options;
  }

  static get query() {
    const query = new this.Query(this);
    if (this._config && this._config._options && this._config._options.query) {
      query.setOptions(this._config._options.query);
    }
    return query;
  }

  static get where() {
    return new this.Query.Where();
  }
}

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

// circular deps
Model.Field = require('./Field');
Model.Virtual = require('./Virtual');
Model.Query = require('./Query');
