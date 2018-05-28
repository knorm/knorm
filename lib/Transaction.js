const KnormError = require('./KnormError');

class Transaction {
  constructor(transactionCallback) {
    if (typeof transactionCallback !== 'function') {
      throw new this.constructor.TransactionError(
        'no `transaction` function provided'
      );
    }

    this.models = {};
    this.transaction = transactionCallback;

    const transaction = this;
    const knorm = this.constructor.knorm;

    this.Field = knorm.Field;
    this.Model = class TransactionModel extends knorm.Model {};
    this.Query = this.Model.Query = class TransactionQuery extends knorm.Query {
      async query(sql) {
        return transaction.query(sql);
      }
    };

    Object.entries(knorm.models).forEach(([name, model]) => {
      this[name] = this.models[name] = class extends model {};
      this[name].Query = class TransactionQuery extends this[name].Query {
        async query(sql) {
          return transaction.query(sql);
        }
      };
    });
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
