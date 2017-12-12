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

  getQuery({ forInsert }, options = {}) {
    const query = this.constructor.query.setOptions(options).first(true);

    if (options.require === undefined) {
      query.require(true);
    }

    if (forInsert) {
      return query;
    }

    query.forge(false);

    const primaryField = this.constructor.primary.name;
    const primary = this[primaryField];

    if (primary !== undefined) {
      return query.where({ [primaryField]: primary });
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
    const row = await this.getQuery({ forFetch: true }, options).fetch();
    return row ? this.setData(row) : row;
  }

  async delete(options) {
    const row = await this.getQuery({ forDelete: true }, options).delete();
    return row ? this.setData(row) : row;
  }

  async update(options) {
    const row = await this.getQuery({ forUpdate: true }, options).update(this);
    return row ? this.setData(row) : row;
  }

  async save(options) {
    return this[this.constructor.primary.name] === undefined
      ? this.insert(options)
      : this.update(options);
  }

  async insert(options) {
    return this.getQuery({ forInsert: true }, options).insert(this);
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

  static async fetchByPrimaryField(primary, options) {
    return new this({ [this.primary.name]: primary }).fetch(options);
  }

  static async deleteByPrimaryField(primary, options) {
    return new this({ [this.primary.name]: primary }).delete(options);
  }

  static async updateByPrimaryField(primary, data, options) {
    return new this(
      Object.assign({}, data, { [this.primary.name]: primary })
    ).update(options);
  }

  static _inheritConfig() {
    if (!this._config) {
      Object.defineProperty(this, '_config', {
        value: {
          model: this,
          references: {},
          fields: {},
          virtuals: {},
          notUpdated: [],
          unique: []
        },
        writable: true
      });
    }
    if (this._config.model !== this) {
      const clone = (items, item) => {
        items[item.name] = item.clone({ model: this });
        return items;
      };
      const parent = this._config;
      const inherited = {
        model: this,
        notUpdated: parent.notUpdated.slice(),
        unique: parent.unique.slice(),
        references: Object.assign({}, parent.references),
        fields: Object.values(parent.fields).reduce(clone, {}),
        virtuals: Object.values(parent.virtuals).reduce(clone, {})
      };
      if (parent.primary) {
        inherited.primary = inherited.fields[parent.primary.name];
      }
      this._config = inherited;
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
      if (field.primary) {
        this._config.primary = field;
      }
      if (field.updated === false) {
        this._config.notUpdated.push(field.name);
      } else {
        const index = this._config.notUpdated.indexOf(field.name);
        if (index > -1) {
          this._config.notUpdated.splice(index, 1);
        }
      }
      if (field.unique) {
        this._config.unique.push(field.name);
      } else {
        const index = this._config.unique.indexOf(field.name);
        if (index > -1) {
          this._config.unique.splice(index, 1);
        }
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

  static getPrimary() {
    this._inheritConfig();
    const primary = this._config.primary;
    if (!primary) {
      throw new Error(`\`${this.name}\` has no primary field`);
    }
    return primary;
  }

  static getNotUpdated() {
    this._inheritConfig();
    return this._config.notUpdated;
  }

  static getUnique() {
    this._inheritConfig();
    return this._config.unique;
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

  static get primary() {
    return this.getPrimary();
  }

  static get notUpdated() {
    return this.getNotUpdated();
  }

  static get unique() {
    return this.getUnique();
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
