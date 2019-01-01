const KnormError = require('./KnormError');

class ConnectionError extends KnormError {}

/**
 * Defines how to connect to the database and run queries e.g. via plugins.
 */
class Connection {
  /**
   * Called by {@link Query#connect} and {@link Transaction#connect} to connect
   * to the database (or acquire clients from a connection pool).
   *
   * @throws {ConnectionError} If the method is not implemented.
   */
  create() {
    throw new this.constructor.ConnectionError(
      '`Connection.prototype.create` is not implemented'
    );
  }

  /**
   * Called by {@link Query#execute}, {@link Transaction#_begin},
   * {@link Transaction#_commit} and {@link Transaction#_rollback} to execute a
   * query with the connection created by {@link Connection#create}.
   *
   * @param {string|object} sql The SQL to query.
   * @param {string} sql.text The parameterized SQL string (with placeholders),
   * when `sql` is passed as an object.
   * @param {array} sql.values The values for the parameterized SQL string, when
   * `sql` is passed as an object.
   *
   * @throws {ConnectionError} If the method is not implemented.
   */
  query() {
    throw new this.constructor.ConnectionError(
      '`Connection.prototype.query` is not implemented'
    );
  }

  /**
   * Called by {@link Query#close} and {@link Transaction#close} to close the
   * connection created by {@link Connection#create}.
   *
   * @throws {ConnectionError} If the method is not implemented.
   */
  close() {
    throw new this.constructor.ConnectionError(
      '`Connection.prototype.close` is not implemented'
    );
  }
}

module.exports = Connection;

/**
 * The base error that all errors thrown by {@link Connection} inherit from.
 */
Connection.ConnectionError = ConnectionError;

/**
 * A reference to the {@link Knorm} instance.
 *
 * ::: tip
 * This is the same instance assigned to the {@link Connection.knorm} static
 * property, just added as a convenience for use in instance methods.
 * :::
 *
 * @type {Knorm}
 */
Connection.prototype.knorm = null;

/**
 * A reference to the {@link Knorm} instance.
 *
 * ::: tip
 * This is the same instance assigned to the {@link Connection#knorm} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Knorm}
 */
Connection.knorm = null;
