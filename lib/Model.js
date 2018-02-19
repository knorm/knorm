const { upperFirst } = require('lodash');

class Model {
  constructor(data = {}) {
    const config = this.constructor.config;
    const unique = config.unique;
    const fields = config.fields;
    const virtuals = config.virtuals;
    const virtualValues = Object.values(virtuals);
    const virtualDescriptors = {};

    virtualValues.forEach(virtual => {
      virtualDescriptors[virtual.name] = {
        get: virtual.get,
        set: virtual.set,
        enumerable: true
      };
    });

    Object.defineProperties(
      this,
      Object.assign(
        {
          _knorm: {
            value: {
              config: config,
              unique: unique,
              fields: fields,
              fieldValues: Object.values(fields),
              virtuals: virtuals,
              virtualValues: virtualValues
            }
          }
        },
        virtualDescriptors
      )
    );

    this.setData(data);
  }

  getFields(fields) {
    if (!fields || !fields.length) {
      return this._knorm.fieldValues;
    }
    return fields.map(field => {
      if (typeof field === 'string') {
        // TODO: strict mode: throw if the field-name is not a valid field
        return this._knorm.fields[field];
      }
      return field;
    });
  }

  // TODO: make async
  setDefaults({ fields } = {}) {
    this.getFields(fields).forEach(field => {
      const name = field.name;

      if (this[name] === undefined) {
        if (field.hasDefault()) {
          this[name] = field.getDefault(this);
        }
      }
    });

    return this;
  }

  // TODO: add support for casting referenced models to id
  // ie this.someId = value.id;
  setData(data) {
    // TODO: strict mode: for virtues, check if it has a setter
    Object.assign(this, data);
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
      virtuals = this._knorm.virtualValues
        .filter(virtual => virtual.hasGetter())
        .map(virtual => virtual.name);
    }
    return virtuals;
  }

  _getVirtualData(name) {
    const virtual = this._knorm.virtuals[name];
    if (!virtual.get) {
      // TODO: return undefined instead
      throw new Error(
        `Virtual '${this.constructor.name}.${name}' has no getter`
      );
    }
    return virtual.get.call(this);
  }

  async getVirtualData({ virtuals } = {}) {
    virtuals = this._getVirtualGetters(virtuals);

    const virtualsData = await Promise.all(
      virtuals.map(async name => this._getVirtualData(name))
    );

    return virtuals.reduce((data, name, index) => {
      data[name] = virtualsData[index];
      return data;
    }, {});
  }

  getVirtualDataSync({ virtuals } = {}) {
    virtuals = this._getVirtualGetters(virtuals);

    const isPromise = value =>
      typeof value === 'object' && typeof value.then === 'function';

    return virtuals.reduce((data, name) => {
      const value = this._getVirtualData(name);

      if (!isPromise(value)) {
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

  // TODO: make async
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
    const query = this.constructor.query.setOptions(options).first(true);

    if (options.require === undefined) {
      query.require(true);
    }

    if (forInsert) {
      return query;
    }

    query.forge(false);

    const primaryField = this._knorm.config.primary;
    const primaryFieldValue = this[primaryField];

    if (primaryFieldValue !== undefined) {
      return query.where({ [primaryField]: primaryFieldValue });
    }

    const uniqueFields = this._knorm.unique;
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

  async fetch(options) {
    const row = await this.getQuery(options).fetch();
    return row ? this.setData(row) : row;
  }

  async delete(options) {
    const row = await this.getQuery(options).delete();
    return row ? this.setData(row) : row;
  }

  async update(options) {
    const row = await this.getQuery(options).update(this);
    return row ? this.setData(row) : row;
  }

  // TODO: this will throw if the model has no primary field.. is that expected?
  async save(options) {
    return this[this._knorm.config.primary] === undefined
      ? this.insert(options)
      : this.update(options);
  }

  async insert(options) {
    return this.getQuery(options, { forInsert: true }).insert(this);
  }

  static async count(options) {
    return this.query.count(options);
  }

  static async save(data, options) {
    return this.query.save(data, options);
  }

  static async insert(data, options) {
    return this.query.insert(data, options);
  }

  static async update(data, options) {
    return this.query.update(data, options);
  }

  static async fetch(options) {
    return this.query.fetch(options);
  }

  static async delete(options) {
    return this.query.delete(options);
  }

  static getConfig() {
    const model = this;
    const config = {
      model,
      _fields: {},
      _virtuals: {},
      references: {},
      unique: [],
      notUpdated: [],
      columnsToFields: {},
      fieldsToColumns: {}
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
          Object.keys(fields).forEach(name => {
            if (model.prototype[name] !== undefined) {
              throw new Error(
                `${model.name}: cannot add field \`${name}\` ` +
                  `(\`${model.name}.prototype.${name}\` is already assigned)`
              );
            }
            if (config._virtuals[name] !== undefined) {
              throw new Error(
                `${model.name}: cannot add field \`${name}\` ` +
                  `(\`${name}\` is a virtual)`
              );
            }

            let fieldConfig = fields[name];

            if (typeof fieldConfig === 'string') {
              fieldConfig = { type: fieldConfig };
            }

            if (fieldConfig instanceof model.Field) {
              fieldConfig = Object.assign({}, fieldConfig.config, { model });
            } else {
              fieldConfig = Object.assign({}, fieldConfig, { name, model });
            }

            const field = new model.Field(fieldConfig);

            if (field.references) {
              config.references[name] = field.references;
            }

            if (field.primary) {
              config._primary = name;
            } else if (config._primary === name) {
              config._primary = undefined;
            }

            if (field.updated === false) {
              config.notUpdated.push(name);
            } else {
              const index = config.notUpdated.indexOf(name);
              if (index > -1) {
                config.notUpdated.splice(index, 1);
              }
            }

            if (field.unique) {
              config.unique.push(name);
            } else {
              const index = config.unique.indexOf(name);
              if (index > -1) {
                config.unique.splice(index, 1);
              }
            }

            if (field.methods && (field.primary || field.unique)) {
              const formattedName = upperFirst(name);

              model[`fetchBy${formattedName}`] = async function(
                value,
                options
              ) {
                return new model({ [name]: value }).fetch(options);
              };

              model[`updateBy${formattedName}`] = async function(
                value,
                data,
                options
              ) {
                data = Object.assign({}, data, { [name]: value });
                return new model(data).update(options);
              };

              model[`deleteBy${formattedName}`] = async function(
                value,
                options
              ) {
                return new model({ [name]: value }).delete(options);
              };
            }

            config._fields[name] = field;
            config.fieldsToColumns[name] = field.column;
            config.columnsToFields[field.column] = name;
          });
        }
      },
      virtuals: {
        get() {
          return config._virtuals;
        },
        set(virtuals) {
          Object.keys(virtuals).forEach(name => {
            if (model.prototype[name] !== undefined) {
              throw new Error(
                `${model.name}: cannot add virtual \`${name}\` ` +
                  `(\`${model.name}.prototype.${name}\` is already assigned)`
              );
            }
            if (config._fields[name] !== undefined) {
              throw new Error(
                `${model.name}: cannot add virtual \`${name}\` ` +
                  `(\`${name}\` is a field)`
              );
            }

            config._virtuals[name] = new model.Virtual({
              name,
              model,
              descriptor: virtuals[name]
            });
          });
        }
      }
    });

    return config;
  }

  static get config() {
    if (!this._config) {
      Object.defineProperty(this, '_config', {
        value: this.getConfig(),
        writable: true
      });
    } else if (this._config.model !== this) {
      const parentConfig = this._config;
      this._config = this.getConfig();
      this._config.fields = parentConfig._fields;
      this._config.virtuals = parentConfig._virtuals;
    }

    return this._config;
  }

  static set fields(fields) {
    this.config.fields = fields;
  }

  static set virtuals(virtuals) {
    this.config.virtuals = virtuals;
  }

  static get fields() {
    return this.config.fields;
  }

  static get virtuals() {
    return this.config.virtuals;
  }

  // TODO: remove these getters and access configs directly

  static get references() {
    return this.config.references;
  }

  static get primary() {
    return this.config.primary;
  }

  static get notUpdated() {
    return this.config.notUpdated;
  }

  static get unique() {
    return this.config.unique;
  }

  static get query() {
    return new this.Query(this);
  }

  static set query(val) {
    throw new Error(`${this.name}.query cannot be overwriten`);
  }
}

module.exports = Model;

// circular deps
Model.Field = require('./Field');
Model.Virtual = require('./Virtual');
Model.Query = require('./Query');
