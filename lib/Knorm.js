class Knorm {
  constructor({ fieldToColumn } = {}) {
    this.plugins = {};
    this.models = {};

    addExports(this);

    class Model extends this.Model {}
    class Query extends this.Query {}
    class Transaction extends this.Transaction {}

    let Field = this.Field;

    if (typeof fieldToColumn === 'function') {
      Field = class extends this.Field {
        getColumnName(fieldName) {
          return fieldToColumn.call(this, fieldName);
        }
      };
      Model.Field = Field;
    }

    Model.knorm = this;
    Field.knorm = this;
    Query.knorm = this;
    Transaction.knorm = this;

    Model.Query = Query;

    this.Field = Field;
    this.Model = Model;
    this.Query = Query;
    this.Transaction = Transaction;
  }

  // TODO: add Knorm.prototype.clone

  use(plugin) {
    if (!plugin) {
      throw new this.KnormError('no plugin provided');
    }

    if (typeof plugin !== 'function' && typeof plugin.init !== 'function') {
      throw new this.KnormError('invalid plugin provided');
    }

    const { name } = plugin;

    if (!name) {
      throw new this.KnormError('plugins should have a `name`');
    }

    if (this.plugins[name] !== undefined) {
      throw new this.KnormError(`plugin \`${name}\` has already been added`);
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
      throw new this.KnormError(`no model provided`);
    }

    if (!(model.prototype instanceof this.Model) && model !== this.Model) {
      throw new this.KnormError(
        `model should be a subclass of \`knorm.Model\``
      );
    }

    const { name } = model;

    if (this.models[name]) {
      throw new this.KnormError(`model \`${name}\` has already been added`);
    }

    if (this[name]) {
      throw new this.KnormError(
        `cannot use \`${name}\` as a model name (reserved property)`
      );
    }

    this[name] = model;
    this.models[name] = model;
  }
}

module.exports = Knorm;

// avoid circular deps
const addExports = require('./addExports');
addExports(Knorm);
