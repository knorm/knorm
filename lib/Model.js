const { upperFirst } = require('lodash');

class Model {
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

    // the name `_knorm_` attemps to avoid conflicts with user-provided field/virtual names
    descriptors._knorm_ = { value: { config, unique, fields, virtuals } };
    Object.defineProperties(this, descriptors);

    this.setData(data);
  }

  // TODO: strict mode: throw if the field-name is not a valid field
  getField(field) {
    return this._knorm_.fields[field];
  }

  // TODO: strict mode: throw if the field-name is not a valid field
  getFields(fields) {
    if (!fields || !fields.length) {
      return Object.values(this._knorm_.fields);
    }

    return fields.map(field => {
      if (typeof field === 'string') {
        return this.getField(field);
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

  // TODO: add support for casting referenced models to id ie this.someId = value.id;
  // TODO: strict mode: for virtues, check if it has a setter
  // TODO: strict mode: check if all fields in the data are valid field names
  setData(data) {
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
      virtuals = Object.values(this._knorm_.virtuals)
        .filter(virtual => !!virtual.get)
        .map(virtual => virtual.name);
    }

    return virtuals;
  }

  // TODO: return `undefined` if a virtual has no getter instead of throwing (but throw in strict mode)
  // TODO: strict mode: throw if the virtual-name is not a valid virtual
  _getVirtualData(name) {
    const virtual = this._knorm_.virtuals[name];

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

  // TODO: make async?
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

    query
      .setOptions(options)
      .first(true)
      .forge(false);

    if (options.require === undefined) {
      query.require(true);
    }

    if (forInsert) {
      return query;
    }

    const primaryField = this._knorm_.config.primary;
    const primaryFieldValue = this[primaryField];

    if (primaryFieldValue !== undefined) {
      return query.where({ [primaryField]: primaryFieldValue });
    }

    const uniqueFields = this._knorm_.unique;
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
    return row ? this.setData(row).cast({ forFetch: true }) : row;
  }

  async delete(options) {
    const row = await this.getQuery(options).delete();
    return row ? this.setData(row).cast({ forFetch: true }) : row;
  }

  async update(options) {
    const row = await this.getQuery(options).update(this);
    return row ? this.setData(row).cast({ forFetch: true }) : row;
  }

  async insert(options) {
    const row = await this.getQuery(options, { forInsert: true }).insert(this);
    return row ? this.setData(row).cast({ forFetch: true }) : row;
  }

  // TODO: this will throw if the model has no primary field.. is that expected?
  async save(options) {
    return this[this._knorm_.config.primary] === undefined
      ? this.insert(options)
      : this.update(options);
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

    if (field.methods && (field.primary || field.unique)) {
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

    this._config._fields[name] = field;
    this._config.fieldsToColumns[name] = field.column;
    this._config.fieldNames.push(name);
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
      }
    });

    return config;
  }

  static get config() {
    if (!this._config) {
      Object.defineProperty(this, '_config', {
        value: this.createConfig(),
        writable: true
      });
    } else if (this._config.model !== this) {
      const parentConfig = this._config;
      this._config = this.createConfig();
      this._config.table = parentConfig.table;
      this._config.fields = parentConfig._fields;
      this._config.virtuals = parentConfig._virtuals;
    }

    return this._config;
  }

  static set table(table) {
    this.config.table = table;
  }

  static get table() {
    return this.config.table;
  }

  static set fields(fields) {
    this.config.fields = fields;
  }

  static get fields() {
    return this.config.fields;
  }

  static set virtuals(virtuals) {
    this.config.virtuals = virtuals;
  }

  static get virtuals() {
    return this.config.virtuals;
  }

  static get query() {
    return new this.Query(this);
  }

  static get where() {
    return new this.Query.Where();
  }
}

module.exports = Model;

// circular deps
Model.Field = require('./Field');
Model.Virtual = require('./Virtual');
Model.Query = require('./Query');
