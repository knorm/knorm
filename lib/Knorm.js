const AbstractModel = require('./Model');
const AbstractQuery = require('./Query');
const AbstractField = require('./Field');
const AbstractTransaction = require('./Transaction');

const regularExports = {
  KnormError: require('./KnormError'),
  QueryError: require('./QueryError'),
  ValidationError: require('./ValidationError')
};

const addRegularExports = object => {
  Object.keys(regularExports).forEach(key => {
    object[key] = regularExports[key];
  });
};

class Knorm {
  constructor({ knex, fieldNameToColumnName } = {}) {
    if (typeof knex !== 'function') {
      throw new Error('Knorm: no knex instance provided');
    }

    class Model extends AbstractModel {}
    class Query extends AbstractQuery {}
    class Transaction extends AbstractTransaction {}

    Query.knex = knex;
    Transaction.knex = knex;

    let Field = AbstractField;
    if (typeof fieldNameToColumnName === 'function') {
      Field = class extends AbstractField {
        getColumnName(fieldName) {
          return fieldNameToColumnName.call(this, fieldName);
        }
      };
      Model.Field = Field;
    }

    Model.Query = Query;

    this.Model = Model;
    this.Query = Query;
    this.Field = Field;
    this.Transaction = Transaction;

    addRegularExports(this);
  }
}

Knorm.Model = AbstractModel;
Knorm.Query = AbstractQuery;
Knorm.Field = AbstractField;
Knorm.Transaction = AbstractTransaction;

addRegularExports(Knorm);

module.exports = Knorm;
