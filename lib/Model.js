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

  getField(name) {
    // TODO: move this to the Model.fields getter?
    const field = this.constructor.fields[name];
    if (!field) {
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

  _initQuery(options = {}) {
    const query = this.constructor.query.setOptions(options);

    if (options.require === undefined) {
      query.require(true);
    }

    return query;
  }

  _initQueryWithWhere(operation, options = {}) {
    const query = this._initQuery(options);
    const id = this[this.constructor.fieldNames.id];

    if (id === undefined) {
      throw new Error(
        `${this.constructor
          .name}: cannot ${operation} an instance if the \`${this.constructor
          .fieldNames.id}\` field is not set`
      );
    }

    return query.where({ [this.constructor.fieldNames.id]: id });
  }

  async fetch(options) {
    const row = await this._initQueryWithWhere('fetch', options)
      .first(true)
      .forge(false)
      .fetch();

    return row ? this.setData(row) : row;
  }

  async delete(options) {
    const row = await this._initQueryWithWhere('delete', options)
      .first(true)
      .forge(false)
      .delete();

    return row ? this.setData(row) : row;
  }

  async update(options) {
    const row = await this._initQueryWithWhere('update', options)
      .first(true)
      .forge(false)
      .update(this);

    return row ? this.setData(row) : row;
  }

  async save(options) {
    return this[this.constructor.fieldNames.id] === undefined
      ? this.insert(options)
      : this.update(options);
  }

  async insert(options) {
    return this._initQuery(options)
      .first(true)
      .insert(this);
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

  static async fetchById(id, options) {
    ensureIdFieldIsConfigured(this);
    const instance = new this({ [this.fieldNames.id]: id });
    return instance.fetch(options);
  }

  static async deleteById(id, options) {
    ensureIdFieldIsConfigured(this);
    const instance = new this({ [this.fieldNames.id]: id });
    return instance.delete(options);
  }

  static async updateById(id, data, options) {
    ensureIdFieldIsConfigured(this);
    data = Object.assign({}, data, { [this.fieldNames.id]: id });
    const instance = new this(data);
    return instance.update(options);
  }

  static _inheritConfig() {
    if (!this._config) {
      Object.defineProperty(this, '_config', {
        value: {
          name: this.name,
          references: {},
          fields: {},
          virtuals: {},
          fieldNames: { id: 'id' }
        },
        writable: true
      });
    }
    if (this._config.name !== this.name) {
      const clone = (items, item) => {
        items[item.name] = item.clone().updateModel(this);
        return items;
      };
      this._config = Object.assign(
        {},
        {
          name: this.name,
          references: Object.assign({}, this._config.references),
          fields: Object.values(this._config.fields).reduce(clone, {}),
          virtuals: Object.values(this._config.virtuals).reduce(clone, {}),
          fieldNames: Object.assign({}, this._config.fieldNames)
        }
      );
    }
  }

  static getReferences() {
    this._inheritConfig();
    return this._config.references;
  }

  static getFields() {
    this._inheritConfig();
    return this._config.fields;
  }

  static setFields(fields) {
    this._inheritConfig();
    Object.keys(fields).forEach(name => {
      if (this.prototype[name] !== undefined) {
        throw new Error(
          `${this.name}: cannot add field \`${name}\` ` +
            `(\`${this.name}.prototype.${name}\` is already assigned)`
        );
      }
      if (this._config.virtuals[name] !== undefined) {
        throw new Error(
          `${this.name}: cannot add field \`${name}\` ` +
            `(\`${name}\` is a virtual)`
        );
      }
      const field = new this.Field(
        Object.assign({}, fields[name], {
          name,
          model: this
        })
      );
      if (field.references) {
        this._config.references[field.name] = field.references;
      }
      this._config.fields[name] = field;
    });
  }

  static getVirtuals() {
    this._inheritConfig();
    return this._config.virtuals;
  }

  static setVirtuals(virtuals) {
    this._inheritConfig();
    Object.keys(virtuals).forEach(name => {
      if (this.prototype[name] !== undefined) {
        throw new Error(
          `${this.name}: cannot add virtual \`${name}\` ` +
            `(\`${this.name}.prototype.${name}\` is already assigned)`
        );
      }
      if (this._config.fields[name] !== undefined) {
        throw new Error(
          `${this.name}: cannot add virtual \`${name}\` ` +
            `(\`${name}\` is a field)`
        );
      }
      this._config.virtuals[name] = new this.Virtual({
        name,
        model: this,
        descriptor: virtuals[name]
      });
    });
  }

  static getFieldNames() {
    this._inheritConfig();
    return this._config.fieldNames;
  }

  static setFieldNames(fieldNames) {
    this._inheritConfig();
    Object.keys(fieldNames).forEach(name => {
      this._config.fieldNames[name] = fieldNames[name];
    });
  }

  static get references() {
    return this.getReferences();
  }

  static get fields() {
    return this.getFields();
  }

  static set fields(fields) {
    this.setFields(fields);
  }

  static get virtuals() {
    return this.getVirtuals();
  }

  static set virtuals(virtuals) {
    this.setVirtuals(virtuals);
  }

  static get fieldNames() {
    return this.getFieldNames();
  }

  static set fieldNames(fieldNames) {
    this.setFieldNames(fieldNames);
  }

  static get query() {
    return new this.Query(this);
  }

  static set query(val) {
    throw new Error(`${this.name}.query cannot be overwriten`);
  }
}

const ensureIdFieldIsConfigured = model => {
  if (!model.fields[model.fieldNames.id]) {
    throw new Error(
      `${model.name} has no id field ('${model.fieldNames.id}') configured`
    );
  }
};

module.exports = Model;

// circular deps
Model.Field = require('./Field');
Model.Virtual = require('./Virtual');
Model.Query = require('./Query');
