class Model {
  constructor(data = {}) {
    Object.values(this.constructor.virtuals).forEach(virtual => {
      const name = virtual.name;

      if (this[name] !== undefined) {
        throw new Error(
          `Cannot add Getter/Setter for virtual '${this.constructor
            .name}.${name}' ` +
            `(${this.constructor.name}.prototype.${name} is already assigned)`
        );
      }

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

  _getField(name) {
    const field = this.constructor.fields[name];
    if (!field) {
      throw new Error(`Unknown field '${this.constructor.name}.${name}'`);
    }
    return field;
  }

  _getFields(fields) {
    if (!fields || !fields.length) {
      return Object.values(this.constructor.fields);
    }
    return fields.map(field => {
      if (typeof field === 'string') {
        field = this._getField(field);
      }
      return field;
    });
  }

  setDefaults({ fields } = {}) {
    this._getFields(fields).forEach(field => {
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
    return this._getFields(fields).reduce((data, field) => {
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
      this._getFields(fields).map(field => {
        const name = field.name;
        const value = this[name];
        return field.validate(value, this);
      })
    );

    return this;
  }

  async cast({ fields, save, fetch } = {}) {
    this._getFields(fields).forEach(field => {
      const name = field.name;
      const value = this[name];

      if (value !== undefined) {
        if (field.hasCast({ save, fetch })) {
          const newValue = field.cast(value, this, { save, fetch });
          if (newValue !== undefined) {
            this[name] = newValue;
          }
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

  async _initQueryWithWhereOption(options = {}) {
    const query = this._initQuery(options);

    if (options.where === undefined) {
      // TODO: since knorm requires `id`, use it here instead of using all the data
      const where = await this.getData();
      query.where(where);
    }

    return query;
  }

  async fetch(options = {}) {
    const query = await this._initQueryWithWhereOption(options);

    query.first(true).forge(false);

    const row = await query.fetch();

    if (!row) {
      return row;
    }

    return this.setData(row);
  }

  async delete(options = {}) {
    const query = await this._initQueryWithWhereOption(options);

    query.forge(false);

    const rows = await query.delete();

    if (!rows) {
      return rows;
    }

    if (rows.length === 1) {
      return this.setData(rows[0]);
    } else {
      // TODO: attempt to support LIMIT 1 for delete()
      return rows.map(row => new this.constructor(row));
    }
  }

  async save(options = {}) {
    const query = this._initQuery(options);
    return query.save(this);
  }

  async insert(options = {}) {
    const query = this._initQuery(options);
    return query.insert(this);
  }

  async update(options = {}) {
    const query = this._initQuery(options);
    return query.update(this);
  }

  static async save(data, options) {
    return this.query.setOptions(options).save(data);
  }

  static async insert(data, options) {
    return this.query.setOptions(options).insert(data);
  }

  static async update(data, options) {
    return this.query.setOptions(options).update(data);
  }

  static async fetch(options) {
    return this.query.setOptions(options).fetch();
  }

  static async delete(options) {
    return this.query.setOptions(options).delete();
  }

  static async fetchById(id, options) {
    ensureIdFieldIsConfigured(this);
    const instance = new this({ [this.idField]: id });
    return instance.fetch(options);
  }

  static async deleteById(id, options) {
    ensureIdFieldIsConfigured(this);
    const instance = new this({ [this.idField]: id });
    return instance.delete(options);
  }

  static async updateById(id, data, options) {
    ensureIdFieldIsConfigured(this);
    data = Object.assign({}, data, { [this.idField]: id });
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

const createFieldsOrVirtuals = (model, which) => {
  if (!model[`_${which}`]) {
    Object.defineProperty(model, `_${which}`, {
      value: {},
      writable: true
    });

    Object.defineProperty(model, `_${which}ClassName`, {
      value: model.name,
      writable: true
    });
  }

  if (model[`_${which}ClassName`] !== model.name) {
    model[`_${which}`] = Object.values(
      model[`_${which}`]
    ).reduce((fields, field) => {
      fields[field.name] = field.clone().setModel(model);
      return fields;
    }, {});
    model[`_${which}ClassName`] = model.name;
  }
};

const createFields = model => {
  createFieldsOrVirtuals(model, 'fields');
};

const addFields = (model, fields) => {
  Object.keys(fields).forEach(name => {
    const fieldConfig = Object.assign({ name, model }, fields[name]);
    const field = new model.Field(fieldConfig);

    model._fields[name] = field;
  });
};

const createVirtuals = model => {
  createFieldsOrVirtuals(model, 'virtuals');
};

const addVirtuals = (model, virtuals) => {
  Object.keys(virtuals).forEach(name => {
    const descriptor = virtuals[name];

    model._virtuals[name] = new model.Virtual({
      name,
      model,
      descriptor
    });
  });
};

const ensureIdFieldIsConfigured = model => {
  if (!model.fields[model.idField]) {
    throw new Error(
      `${model.name} has no id field ('${model.idField}') configured`
    );
  }
};

Model.idField = 'id';
Model.createdAtField = 'createdAt';
Model.updatedAtField = 'updatedAt';

module.exports = Model;

// circular deps
Model.Field = require('./Field');
Model.Virtual = require('./Virtual');
Model.Query = require('./Query');
