const KnormError = require('./KnormError');

class TransactionError extends KnormError {}

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

    const transaction = this;

    this.models = Object.entries(this.models).reduce(
      (models, [name, model]) => {
        // extending this way doesn't overwrite the model's name
        models[name] = class extends model {};
        models[name].Query = class extends model.Query {};

        [models[name], models[name].Query].forEach(scopedClass => {
          scopedClass.prototype.models = scopedClass.models = models;
          scopedClass.prototype.transaction = scopedClass.transaction = transaction;
        });

        return models;
      },
      {}
    );
  }

  /**
   * Connects to the database, via {@link Connection#create}. This method is
   * called by {@link Transaction#begin} or by {@link Query#connect} when
   * queries are executed within transactions.
   *
   * @returns {Promise} The `Promise` from {@link Connection#create}, that is
   * resolved when a connection is established or rejected with a
   * {@link TransactionError} on error.
   */
  async connect() {
    try {
      this.connection = new this.constructor.Connection();
      return await this.connection.create();
    } catch (e) {
      throw new this.constructor.TransactionError(e);
    }
  }

  /**
   * Closes the database connection (via {@link Connection#close}) after
   * committing (via {@link Transaction#commit}) or rolling back (via
   * {@link Transaction#rollback}) a transaction.
   *
   * @param {QueryError} [error] The error from {@link Transaction#rollback}, if
   * it was called with one. This error is then passed to
   * {@link Connection#close}.
   *
   * @returns {Promise} The `Promise` from {@link Connection#close}, that is
   * resolved when the connection is closed or rejected with a
   * {@link QueryError} on error.
   */
  async disconnect(error) {
    try {
      return await (error
        ? this.connection.close(error)
        : this.connection.close());
    } catch (e) {
      throw new this.constructor.TransactionError(e);
    }
  }

  /**
   * Begins a transaction, via {@link Transaction#_begin}. If no database
   * connection exists, one is created via {@link Transaction#connect}.
   *
   * @returns {Promise} A `Promise` that is resolved when the transaction is begun
   * or rejected with a {@link TransactionError} on error.
   */
  async begin() {
    if (!this.connection) {
      await this.connect();
    }

    try {
      await this._begin();
      /**
       * Shows the state of a transaction. This is initially `undefined`, set to
       * `true` after {@link Transaction#begin} and finally set to `false` after
       * {@link Transaction#commit} or {@link Transaction#rollback}.
       *
       * @type {boolean}
       */
      this.active = true;
      /**
       * Shows the state of a transaction. This is initially `undefined` and set
       * to `true` after {@link Transaction#begin}. Note that it stays `true`
       * even after {@link Transaction#commit} or {@link Transaction#rollback}.
       *
       * @type {boolean}
       */
      this.started = true;
    } catch (e) {
      const beginError = new this.constructor.TransactionError(e);
      await this.disconnect(beginError);
      throw beginError;
    }
  }

  /**
   * Sends a `BEGIN` query (via {@link Connection#query}) to start a
   * transaction. This can be overloaded to send a different query e.g. `START
   * TRANSACTION`.
   *
   * @returns {Promise} The `Promise` from {@link Connection#query}, that is
   * resolved with the query result.
   */
  async _begin() {
    // TODO: reject with a QueryError instead
    return this.connection.query('BEGIN');
  }

  /**
   * Commits a transaction, via {@link Transaction#_commit} and afterwards
   * closes the database connection, via {@link Transaction#disconnect}. If the
   * commit fails, the transaction is automaticaly rolled back via
   * {@link Transaction#rollback}.
   *
   * @returns {Promise} A `Promise` that is resolved when the transaction is
   * committed and the connection closed or rejected with a
   * {@link TransactionError} on error.
   */
  async commit() {
    if (this.ended) {
      // when running transactions with a callback, allow users to call
      // Transaction#commit within the callback. in that case, let the second
      // call made by us will be a no-op.
      return;
    }

    try {
      await this._commit();
      this.active = false;
      /**
       * Shows the state of a transaction. This is initially `undefined` and
       * only set to `true` after {@link Transaction#commit} or
       * {@link Transaction#rollback}.
       *
       * @type {boolean}
       */
      this.ended = true;
    } catch (e) {
      const commitError = new this.constructor.TransactionError(e);
      await this.rollback(commitError);
      throw commitError;
    }

    // do not disconnect within the try..catch so that errors closing the
    // connection don't lead to Transaction#rollback being called (yet `COMMIT`
    // already ran successfully)
    await this.disconnect();
  }

  /**
   * Sends a `COMMIT` query (via {@link Connection#query}) to commit a
   * transaction. This can be overloaded to send a different query.
   *
   * @returns {Promise} The `Promise` from {@link Connection#query}, that is
   * resolved with the query result.
   */
  async _commit() {
    return this.connection.query('COMMIT');
  }

  /**
   * Rolls back a transaction, via {@link Transaction#_rollback} and afterwards
   * closes the database connection, via {@link Transaction#disconnect}.
   *
   * @param {QueryError} [error] A {@link QueryError} from {@link Query#query},
   * or a {@link TransactionError} from {@link Transaction#commit} or
   * {@link Transaction#rollback}, if one occurs when those methods are run.
   * This error is then passed to {@link Transaction#disconnect} and finally to
   * {@link Connection#close}.
   *
   * @returns {Promise} A `Promise` that is resolved when the transaction is
   * rolled back and the connection closed or rejected with a
   * {@link TransactionError} on error.
   */
  async rollback(error) {
    if (this.ended) {
      // Transaction#rollback is automatically called when a query error occurs.
      // when a transaction is wrapped in a try..catch block (e.g. in
      // transactions with a callback) and Transaction#rollback is called in the
      // catch block, then Transaction#rollback would end up being called twice.
      return;
    }

    try {
      await this._rollback();
    } catch (e) {
      const rollbackError = new this.constructor.TransactionError(e);
      if (!error) {
        error = rollbackError;
      }
      throw rollbackError;
    } finally {
      // update state and disconnect whether or not the ROLLBACK call fails
      this.active = false;
      this.ended = true;
      await (error ? this.disconnect(error) : this.disconnect());
    }
  }

  /**
   * Sends a `ROLLBACK` query (via {@link Connection#query}) to roll back a
   * transaction. This can be overloaded to send a different query.
   *
   * @returns {Promise} The `Promise` from {@link Connection#query}, that is
   * resolved with the query result.
   */
  async _rollback() {
    return this.connection.query('ROLLBACK');
  }

  /**
   * Executes a transaction when [running a transaction with a callback
   * function](/guides/transactions.md#transactions-with-a-callback). This
   * method begins a transaction (via {@link Transaction#begin}), executes the
   * callback function and commits the transaction (via
   * {@link Transaction#commit}).
   *
   * @returns {Promise} A `Promise` that is resolved with the resolution value
   * of the callback function.
   */
  async execute() {
    if (!this.callback) {
      throw new this.constructor.TransactionError(
        'no transaction callback provided'
      );
    }

    await this.begin();

    let result;

    try {
      result = await this.callback(this);
    } catch (e) {
      // NOTE: this error should not be passed to Transaction#rollback. query
      // errors will have already been passed by Query#execute. so any error
      // happening here is not a query error and should not end up being passed
      // to Transaction#disconnect.
      await this.rollback();
      throw e;
    }

    // do not commit within the try..catch, since Transaction#commit itself
    // calls Transaction#rollback on failure
    await this.commit();

    return result;
  }

  /**
   * Simulates a `Promise` interface. This method calls
   * {@link Transaction#execute} and resolves with it's resolution value.
   *
   * @example ```js
   * (async function() {
   *   const value = await new Transaction(async transaction => {
   *     return 'foo';
   *   });
   *
   *   console.log(value); // => 'foo'
   * })();
   * ```
   *
   * @example ```js
   * new Transaction(async transaction => {
   *   return 'foo';
   * }).then(value => {
   *   console.log(value); // => 'foo'
   * });
   * ```
   *
   * @returns {Promise}
   */
  async then() {
    const promise = this.execute();
    return promise.then.apply(promise, arguments);
  }

  /**
   * Simulates a `Promise` interface. This method calls
   * {@link Transaction#execute} and calls `catch` on the promise returned.
   *
   * @example ```js
   * (async function() {
   *   try {
   *     const value = await new Transaction(async transaction => {
   *       throw new Error('foo');
   *     });
   *   } catch (e) {
   *     console.log(e.message); // => 'foo'
   *   }
   * })();
   * ```
   *
   * @example ```js
   * new Transaction(async transaction => {
   *   throw new Error('foo');
   * }).catch(e => {
   *   console.log(e.message); // => 'foo'
   * });
   * ```
   *
   * @returns {Promise}
   */
  async catch() {
    const promise = this.execute();
    return promise.catch.apply(promise, arguments);
  }
}

module.exports = Transaction;

/**
 * The base error that all errors thrown by {@link Transaction} inherit from.
 */
Transaction.TransactionError = TransactionError;

/**
 * A reference to the {@link Knorm} instance.
 *
 * ::: tip
 * This is the same instance assigned to the {@link Transaction.knorm} static
 * property, just added as a convenience for use in instance methods.
 * :::
 *
 * @type {Knorm}
 */
Transaction.prototype.knorm = null;

/**
 * A reference to the {@link Knorm} instance.
 *
 * ::: tip
 * This is the same instance assigned to the {@link Transaction#knorm} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Knorm}
 */
Transaction.knorm = null;

/**
 * The model registry. This is an object containing all the models added to the
 * ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
 * for more info.
 *
 * ::: tip
 * This is the same object assigned to the {@link Transaction.models} static
 * property, just added as a convenience for use in instance methods.
 * :::
 *
 * @type {object}
 */
Transaction.prototype.models = {};

/**
 * The model registry. This is an object containing all the models added to the
 * ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
 * for more info.
 *
 * ::: tip
 * This is the same object assigned to the {@link Transaction#models} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {object}
 */
Transaction.models = {};

/**
 * A reference to {@link Connection}, for use within {@link Transaction}.
 *
 * @type {Connection}
 */
Transaction.Connection = require('./Connection');
