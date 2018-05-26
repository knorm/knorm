const KnormError = require('./KnormError');

class Transaction {
  constructor(callback) {
    if (typeof callback !== 'function') {
      throw new KnormError('Transaction: no `transaction` function provided');
    }

    this.models = {};
    this.callback = callback;

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
    throw new KnormError(
      'Transaction: `Transaction.prototype.query` is not implemented'
    );
  }

  async execute() {
    throw new KnormError(
      'Transaction: `Transaction.prototype.execute` is not implemented'
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

module.exports = Transaction;
