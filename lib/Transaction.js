const KnormError = require('./KnormError');

/**
 * Creates and executes transactions, allowing multiple queries to be run within
 * a transaction.
 */
class Transaction {
  /**
   * Creates a {@link Transaction} instance.
   *
   * @param {function} [callback] The transaction callback, when [running
   * transactions with a callback
   * function](/guides/transactions.md#transactions-with-a-callback).
   */
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

Transaction.knorm = Transaction.prototype.knorm = null;
Transaction.models = Transaction.prototype.models = {};

module.exports = Transaction;
