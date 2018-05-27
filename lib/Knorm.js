class Knorm {
  constructor(config = {}) {
    this.plugins = {};
    this.models = {};
    this.config = config;

    class Model extends this.constructor.Model {}
    class Query extends this.constructor.Query {}
    class Transaction extends this.constructor.Transaction {}

    let Field;
    const { fieldToColumn } = config;

    if (typeof fieldToColumn === 'function') {
      Field = class Field extends this.constructor.Field {
        getColumnName(fieldName) {
          return fieldToColumn.call(this, fieldName);
        }
      };
      Model.Field = Field;
    } else {
      Field = this.constructor.Field;
    }

    Model.Query = Query;

    Model.knorm = this;
    Field.knorm = this;
    Query.knorm = this;
    Transaction.knorm = this;

    this.Field = Field;
    this.Model = Model;
    this.Query = Query;
    this.Transaction = Transaction;
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

  _addModel(name, model) {
    this[name] = model;
    this.models[name] = model;
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

    if (this[name]) {
      throw new this.constructor.KnormError(
        `cannot use \`${name}\` as a model name (reserved property)`
      );
    }

    this._addModel(name, model);
  }

  clone() {
    const clone = new Knorm(this.config);

    Object.values(this.plugins).forEach(plugin => {
      clone.use(plugin);
    });

    Object.entries(this.models).forEach(([name, model]) => {
      // can't use addModel since it validates against this.Model
      clone._addModel(name, model);
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
