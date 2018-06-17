const KnormError = require('./KnormError');

class Transaction {
  constructor(callback) {
    if (typeof callback === 'function') {
      this.callback = callback;
    }

    const models = {};
    const transaction = this;
    const knorm = this.constructor.knorm;

    this.Field = knorm.Field;
    this.Query = class TransactionQuery extends knorm.Query {
      async query(sql) {
        return transaction.query(sql);
      }
    };
    this.Query.prototype.models = models;

    this.Model = class TransactionModel extends knorm.Model {};
    this.Model.Query = this.Query;
    this.Model.prototype.models = models;

    Object.entries(this.models).forEach(([name, model]) => {
      models[name] = class extends model {};
      models[name].Query = class TransactionQuery extends model.Query {
        async query(sql) {
          return transaction.query(sql);
        }
      };

      models[name].prototype.models = models;
      models[name].Query.prototype.models = models;
    });

    this.models = models;
  }

  async query() {
    throw new this.constructor.TransactionError(
      '`Transaction.prototype.query` is not implemented'
    );
  }

  async execute() {
    throw new this.constructor.TransactionError(
      '`Transaction.prototype.execute` is not implemented'
    );
  }

  async then() {
    const promise = this.execute();
    return promise.then.apply(promise, arguments);
  }

  async catch() {
    const promise = this.execute();
    return promise.catch.apply(promise, arguments);
  }
}

Transaction.TransactionError = class TransactionError extends KnormError {};

module.exports = Transaction;
