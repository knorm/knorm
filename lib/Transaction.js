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

  /**
   * Called before a query is sent to the database within a transaction. This
   * allows manipulating the sql if needed, even changing it entirely.
   *
   * NOTE: if this method returns anything, that will be used as the sql to send
   * to the database instead. Therefore, this should be valid sql as expected by
   * {@link Query#query}.
   *
   * @param {Client} client the database client that will be used to run the
   * query.
   * @param {SqlBricks|object|string} sql the sql that will be sent to the
   * database.
   */
  async beforeQuery() {}

  /**
   * Called after a query is sent to the database within a transaction. This
   * allows manipulating the result if needed, even changing it entirely.
   *
   * NOTE: if this method returns anything, that will be used as the result of
   * the query instead. Therefore, this should be a valid result object as
   * expected by {@link Query#query}.
   *
   * @param {Client} client the database client that was used to run the query.
   * @param {SqlBricks|object|string} sql the sql that was sent to the
   * database to generate the result.
   * @param {object} result the result from the database.
   */
  async afterQuery() {}

  /**
   * Runs a query within a transaction. This method is not implemented in
   * @knorm/knorm, it's meant to be implemented by a plugin that provides
   * database access.
   *
   * @param {SqlBricks|object|string} sql
   *
   * @throws {TransactionError} if the method is not implemented.
   */
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
