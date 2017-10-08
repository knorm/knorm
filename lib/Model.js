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

  async cast({ fields, forSave, forFetch } = {}) {
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
    return this._initQuery(options).insert(this);
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

  static get references() {
    createReferences(this);
    return this._references;
  }

  static get referenced() {
    createReferenced(this);
    return this._referenced;
  }

  static get fields() {
    createFields(this);
    return this._fields;
  }

  static set fields(fields) {
    createFields(this);
    addFields(this, fields);
  }

  static get virtuals() {
    createVirtuals(this);
    return this._virtuals;
  }

  static set virtuals(virtuals) {
    createVirtuals(this);
    addVirtuals(this, virtuals);
  }

  static get fieldNames() {
    createFieldNames(this);
    return this._fieldNames;
  }

  static set fieldNames(fieldNames) {
    createFieldNames(this);
    addFieldNames(this, fieldNames);
  }

  static get query() {
    return new this.Query(this);
  }

  static set query(val) {
    throw new Error(`${this.name}.query cannot be overwriten`);
  }
}

const createReferences = model => {
  if (!model._references) {
    Object.defineProperty(model, '_references', { value: {} });
  }
};

const createReferenced = model => {
  if (!model._referenced) {
    Object.defineProperty(model, '_referenced', { value: {} });
  }
};

const createFields = model => {
  if (!model._fields) {
    Object.defineProperty(model, '_fields', { value: {}, writable: true });
    Object.defineProperty(model, '_fieldsModelName', {
      value: model.name,
      writable: true
    });
  }

  if (model._fieldsModelName !== model.name) {
    model._fields = Object.values(model._fields).reduce((fields, field) => {
      fields[field.name] = field.clone().updateModel(model);
      return fields;
    }, {});
    model._fieldsModelName = model.name;
  }
};

const addFields = (model, fields) => {
  Object.keys(fields).forEach(name => {
    if (model.prototype[name] !== undefined) {
      throw new Error(
        `${model.name}: cannot add field \`${name}\` ` +
          `(\`${model.name}.prototype.${name}\` is already assigned)`
      );
    }
    if (model._virtuals && model._virtuals[name] !== undefined) {
      throw new Error(
        `${model.name}: cannot add field \`${name}\` ` +
          `(\`${name}\` is a virtual)`
      );
    }
    const fieldConfig = Object.assign({ name, model }, fields[name]);
    const field = new model.Field(fieldConfig);
    model._fields[name] = field;
  });
};

const createVirtuals = model => {
  if (!model._virtuals) {
    Object.defineProperty(model, '_virtuals', { value: {}, writable: true });
    Object.defineProperty(model, '_virtualsModelName', {
      value: model.name,
      writable: true
    });
  }

  if (model._virtualsModelName !== model.name) {
    model._virtuals = Object.values(
      model._virtuals
    ).reduce((virtuals, virtual) => {
      virtuals[virtual.name] = virtual.clone().updateModel(model);
      return virtuals;
    }, {});
    model._virtualsModelName = model.name;
  }
};

const addVirtuals = (model, virtuals) => {
  Object.keys(virtuals).forEach(name => {
    if (model.prototype[name] !== undefined) {
      throw new Error(
        `${model.name}: cannot add virtual \`${name}\` ` +
          `(\`${model.name}.prototype.${name}\` is already assigned)`
      );
    }
    if (model._fields && model.fields[name] !== undefined) {
      throw new Error(
        `${model.name}: cannot add virtual \`${name}\` ` +
          `(\`${name}\` is a field)`
      );
    }
    const descriptor = virtuals[name];
    model._virtuals[name] = new model.Virtual({
      name,
      model,
      descriptor
    });
  });
};

const createFieldNames = model => {
  if (!model._fieldNames) {
    Object.defineProperty(model, '_fieldNames', {
      value: { id: 'id' },
      writable: true
    });
    Object.defineProperty(model, '_fieldNamesModelName', {
      value: model.name,
      writable: true
    });
  }

  if (model._fieldNamesModelName !== model.name) {
    model._fieldNames = Object.assign({}, model._fieldNames);
    model._fieldNamesModelName = model.name;
  }
};

const addFieldNames = (model, fieldNames) => {
  Object.keys(fieldNames).forEach(name => {
    model._fieldNames[name] = fieldNames[name];
  });
};

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
