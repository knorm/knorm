const { upperFirst } = require('lodash');

class Model {
  constructor(data = {}) {
    Object.values(this.constructor.virtuals).forEach(virtual => {
      const name = virtual.name;
      let { get, set } = virtual;

      if (get) {
        get = get.bind(this);
      }
      if (set) {
        set = set.bind(this);
      }

      Object.defineProperty(this, name, {
        get,
        set,
        enumerable: true
      });
    });

    this.setData(data);
  }

  // TODO: move this to the Model.fields getter?
  getField(name) {
    const field = this.constructor.fields[name];
    if (!field) {
      // TODO: throw ModelError
      throw new Error(`Unknown field '${this.constructor.name}.${name}'`);
    }
    return field;
  }

  getFields(fields) {
    if (!fields || !fields.length) {
      return Object.values(this.constructor.fields);
    }
    return fields.map(field => {
      if (typeof field === 'string') {
        field = this.getField(field);
      }
      return field;
    });
  }

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

  setData(data) {
    Object.keys(data).forEach(name => {
      const value = data[name];
      const field = this.constructor.fields[name];

      if (field) {
        // TODO: add support for casting referenced models to id
        // ie this.someId = value.id;
        this[name] = value;
      } else {
        const virtual = this.constructor.virtuals[name];
        if (!virtual) {
          // TODO: remove this check, unnecessary restriction..
          throw new Error(
            `Unknown field or virtual '${this.constructor.name}.${name}'`
          );
        }
        if (!virtual.hasSetter()) {
          throw new Error(
            `Virtual '${this.constructor.name}.${name}' has no setter`
          );
        }
        this[name] = value;
      }
    });

    return this;
  }

  _getFieldData(fields) {
    return this.getFields(fields).reduce((data, field) => {
      const name = field.name;
      const value = this[name];

      if (value !== undefined) {
        data[name] = value;
      }

      return data;
    }, {});
  }

  async getData({ fields, virtuals } = {}) {
    const data = this._getFieldData(fields);

    if (virtuals) {
      if (!Array.isArray(virtuals) || !virtuals.length) {
        virtuals = Object.values(this.constructor.virtuals)
          .filter(virtual => virtual.hasGetter())
          .map(virtual => virtual.name);
      }
      const virtualsData = await Promise.all(
        virtuals.map(async name => {
          const virtual = this.constructor.virtuals[name];
          if (!virtual.get) {
            throw new Error(
              `Virtual '${this.constructor.name}.${name}' has no getter`
            );
          }
          return virtual.get.call(this);
        })
      );
      virtuals.forEach((name, index) => {
        data[name] = virtualsData[index];
      });
    }

    return data;
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

    const primaryField = this.constructor.primary;
    const primaryFieldValue = this[primaryField];

    if (primaryFieldValue !== undefined) {
      return query.where({ [primaryField]: primaryFieldValue });
    }

    const uniqueFields = this.constructor.unique;
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

  async save(options) {
    return this[this.constructor.primary] === undefined
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
      notUpdated: []
    };

    Object.defineProperty(config, 'primary', {
      get() {
        if (!config._primary) {
          throw new Error(`\`${model.name}\` has no primary field`);
        }
        return config._primary;
      }
    });

    Object.defineProperty(config, 'fields', {
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

            model[`fetchBy${formattedName}`] = async function(value, options) {
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

            model[`deleteBy${formattedName}`] = async function(value, options) {
              return new model({ [name]: value }).delete(options);
            };
          }

          config._fields[name] = field;
        });
      }
    });

    Object.defineProperty(config, 'virtuals', {
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
