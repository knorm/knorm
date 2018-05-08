class Knorm {
  constructor({ fieldToColumn } = {}) {
    addExports(this);

    class Model extends this.Model {}
    class Query extends this.Query {}

    let Field = this.Field;

    if (typeof fieldToColumn === 'function') {
      Field = class extends this.Field {
        getColumnName(fieldName) {
          return fieldToColumn.call(this, fieldName);
        }
      };
      Model.Field = Field;
    }

    Model.Query = Query;

    this.Model = Model;
    this.Query = Query;
    this.Field = Field;
  }

  use(plugin) {
    if (!plugin) {
      throw new this.KnormError('Knorm: no plugin provided');
    }

    if (typeof plugin !== 'function' && typeof plugin.init !== 'function') {
      throw new this.KnormError('Knorm: invalid plugin provided');
    }

    if (plugin.init) {
      plugin.init(this);
    } else {
      plugin(this);
    }

    return this;
  }
}

module.exports = Knorm;

// avoid circular deps
const addExports = require('./addExports');
addExports(Knorm);
