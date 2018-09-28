class Knorm {
  constructor(config = {}) {
    this.plugins = {};
    this.models = {};
    this.config = config;

    class Field extends this.constructor.Field {}
    class Model extends this.constructor.Model {}
    class Query extends this.constructor.Query {}
    class Transaction extends this.constructor.Transaction {}

    const { fieldToColumn } = config;

    if (typeof fieldToColumn === 'function') {
      Field.prototype.getColumnName = function(fieldName) {
        return fieldToColumn.call(this, fieldName);
      };
    }

    [Field, Model, Query, Transaction].forEach(scopedClass => {
      scopedClass.prototype.knorm = scopedClass.knorm = this;
      scopedClass.prototype.models = scopedClass.models = this.models;
      this[scopedClass.name] = scopedClass;
    });

    Model.Field = Field;
    Model.Query = Query;
  }

  use(plugin) {
    if (!plugin) {
      throw new this.constructor.KnormError('no plugin provided');
    }

    if (typeof plugin !== 'function' && typeof plugin.init !== 'function') {
      throw new this.constructor.KnormError('invalid plugin provided');
    }

    const { name } = plugin;

    if (!name) {
      throw new this.constructor.KnormError('plugins should have a `name`');
    }

    if (this.plugins[name] !== undefined) {
      throw new this.constructor.KnormError(
        `plugin \`${name}\` has already been added`
      );
    }

    this.plugins[name] = plugin;

    if (plugin.init) {
      plugin.init(this);
    } else {
      plugin(this);
    }

    return this;
  }

  addModel(model) {
    if (!model) {
      throw new this.constructor.KnormError(`no model provided`);
    }

    if (!(model.prototype instanceof this.Model) && model !== this.Model) {
      throw new this.constructor.KnormError(
        `model should be a subclass of \`knorm.Model\``
      );
    }

    const { name } = model;

    if (this.models[name]) {
      throw new this.constructor.KnormError(
        `model \`${name}\` has already been added`
      );
    }

    this.models[name] = model;
  }

  clone() {
    const clone = new Knorm(this.config);

    Object.values(this.plugins).forEach(plugin => {
      clone.use(plugin);
    });

    Object.entries(this.models).forEach(([name, model]) => {
      clone.models[name] = model;
    });

    return clone;
  }
}

Knorm.Model = require('./Model');
Knorm.Query = require('./Query');
Knorm.Field = require('./Field');
Knorm.Transaction = require('./Transaction');
Knorm.KnormError = require('./KnormError');

module.exports = Knorm;
