const { inspect } = require('util');
const { asArray } = require('./util');
const { difference, chunk, intersection } = require('lodash');
const nanoid = require('nanoid/async');

const isArray = Array.isArray;
const isOptionSet = option => option !== undefined && option !== null;
const isObject = value => typeof value === 'object' && value !== null;
const isString = value => typeof value === 'string';
const isEmpty = value =>
  (isArray(value) && !value.length) ||
  (isObject(value) && !Object.keys(value).length);

/**
 * Creates and runs queries and parses any data returned.
 */
class Query {
  /**
   * Creates a new Query instance.
   *
   * @param {Model} Model
   */
  constructor(Model) {
    this.Model = Model;
    this.options = new this.constructor.Options();
    this.defaultOptions = new this.constructor.Options();
    this.context = {};
  }

  clone() {
    const clone = new this.constructor(this.Model);
    const options = this.getOptions();

    return clone.setOptions(options);
  }

  throwQueryError(message) {
    // TODO: refactor to pass { query, message } object
    throw new this.constructor.QueryError(`${this.Model.name}: ${message}`);
  }

  setDefaultOptions(options) {
    for (const [option, value] of Object.entries(options)) {
      this.defaultOptions[option](value);
    }

    return this;
  }

  // TODO: test re-setting an unset option
  // TODO: add appendOption for array and object options?

  setOption(option, value) {
    this.options[option](value);

    return this;
  }

  setOptions(options) {
    for (const [option, value] of Object.entries(options)) {
      this.setOption(option, value);
    }

    return this;
  }

  // TODO: test the unsetOption also unsets default options i.e. hasOption,
  // getOption and getOptions work as expected
  unsetOption(option) {
    return this.setOption(option, null);
  }

  unsetOptions(options) {
    for (const option of options) {
      this.unsetOption(option);
    }

    return this;
  }

  hasOption(option) {
    const value = this.getOption(option);

    return value !== undefined && value !== null;
  }

  // TODO: should getOption check whether the value is undefined/null?
  getOption(option) {
    return this.options.values[option] || this.defaultOptions.values[option];
  }

  getOptions() {
    const options = {
      ...this.defaultOptions.values,
      ...this.options.values
    };

    // TODO: add support for options scoped by method

    return Object.entries(options)
      .filter(([, value]) => value !== undefined && value !== null)
      .reduce((options, [option, value]) => {
        options[option] = value;
        return options;
      }, {});
  }

  generateQualifier() {
    // TODO: make qualifier-length configurable via an env variable
    return nanoid(5);
  }

  getQualifier() {
    if (!this.hasOption('qualifier')) {
      this.setOption('qualifier', this.generateQualifier());
    }

    return this.getOption('qualifier');
  }

  prepareFrom() {
    // TODO: document that FROM only supports Model, Query and Sql (Raw) instances
    // TODO: document that ONLY fields are inherited for subqueries
    // TODO: document that ALL options are inherited for non-subqueries, except
    // that `from` is hoisted into the parent's `from`
    // TODO: document that inheritance means that the options end up at the root

    // NOTE: object mode (with qualifiers as keys) is not supported because it's
    // hard to configure other opions (where, groupBy etc) which would also need
    // the object qualifier syntax, which would interfere with how those options
    // are set. This is also the reason to only support Model, Query and Raw
    // instances. With Raw, the user gets to configure a qualifier which they
    // can use in Raw parts for other options:
    // User.fetch({
    //   from: User.sql.raw({ text: '(select ?) as "custom"', values: 'bar' }),
    //   fields: User.sql.raw({ text: '"custom"."bar"', fields: ['bar'] }),
    //   where: User.sql.raw({ text: '"custom"."bar" = ?', values: ['bar'] })
    // })
    let from = [];

    for (let value of this.getOption('from')) {
      if (value instanceof Query) {
        const qualifier = value.getQualifier();
        const sql = value.Model.sql.setOptions({ qualifier });

        let inheritance;

        if (value.getOption('subquery')) {
          value = sql.as(value, qualifier);
          inheritance = { fields: sql.fields(value.getOption('fields')) };
        } else {
          value = value.Model;
          inheritance = value.prepareSelect(sql);
          from = from.concat(inheritance.from.value);
        }

        this.setOptions(inheritance);
      }

      from.push(value);
    }

    return this.unsetOption('from').setOption('from', from);
  }

  prepareFields() {
    let fields = [];

    for (const field of this.getOption('fields')) {
      if (typeof field === 'string') {
        fields.push(field);
        continue;
      }
      if (field instanceof Sql.Raw && field.fields) {
        fields = fields.concat(field.fields);
        continue;
      }
      if (typeof field === 'object') {
        fields = fields.concat(Object.keys(field));
        continue;
      }
    }

    // TODO: is this where we want to store these?
    this.context.fields = fields;
  }

  prepareOptions() {
    this.prepareFrom();
    this.prepareFields();
  }

  // TODO: createSelect/getSelect/getSelectSql/prepareSelectSql?
  prepareSelect(sql) {
    this.prepareOptions();

    const parts = {};
    const options = this.getOptions();
    const addPart = option => {
      if (options[option]) {
        parts[option] = sql[option](options[option]);
      }
    };

    // TODO: support `with`
    addPart('all');
    addPart('distinct');
    addPart('fields');
    addPart('from');
    addPart('where');
    addPart('groupBy');
    addPart('having');
    // TODO: support `window`
    // TODO: support `union`, `intersect`, `except`
    addPart('orderBy');
    addPart('limit');
    addPart('offset');
    addPart('forUpdate');
    addPart('forShare');
    addPart('nowait');
    addPart('skipLocked');

    return sql.select(parts);
  }

  formatSelect() {
    const sql = this.Model.sql;
    const select = this.prepareSelect(sql);

    return select.format();
  }

  // TODO: createInsert?
  prepareInsert(data, options) {
    const Sql = this.Model.Sql;
    const sqlParts = [
      Sql.into(),
      Sql.columns(data.fields),
      Sql.values(data.values)
    ];
    const { fields } = options;

    // TODO: support `defaultFields`

    if (fields) {
      sqlParts.push(Sql.returning(fields));
    }

    return Sql.insert(sqlParts);
  }

  formatInsert({ fields, values }) {
    // TODO: add support for options scoped by method i.e. `insert` options

    const options = this.getOptions();
    const batches = chunk(values, options.batchSize || 1);

    return batches.map(batch => {
      const insert = this.prepareInsert({ fields, values: batch }, options);
      const sql = this.Model.sql;

      return {
        text: sql.formatInsert(insert),
        values: sql.getValues(),
        fields: sql.getFields()
      };
    });
  }

  // TODO: strict mode: throw if data is not an array (for inserts) nor an object
  // TODO: strict mode: throw if instance is not an instance of this.model
  getInstance(data) {
    if (data instanceof this.Model) {
      // TODO: strict mode: validate that the instance is an instance of this.model
      return data;
    }
    return new this.Model(data);
  }

  // depended on by @knorm/postgres
  getRowValue({ value }) {
    return value;
  }

  // depended on by @knorm/postgres
  getCastFields(fields) {
    return fields;
  }

  // TODO: strict mode: throw if row is empty
  async prepareRow(row) {
    const model = new this.Model(row);

    if (this.hasOption('insert')) {
      await model.setDefaultValues();
    }

    await model.validateValues();
    await model.prepareValues();

    // TODO: test that an error is thrown if the value is undefined

    return model.$values;
  }

  // TODO: strict mode: warn/throw if no data is passed
  // TODO: strict mode: warn/throw if row is empty
  async prepareRows(rows) {
    // TODO: throw if fields do not match in all rows

    return Promise.all(asArray(rows).map(row => this.prepareRow(row)));
  }

  prepareBatches(rows) {
    const batchSize = this.getOption('batchSize') || 1;

    return chunk(rows, batchSize);
  }

  // TODO: v2: refactor prepareUpdateBatch => getUpdateBatch
  // depended on by knorm-postgres
  prepareUpdateBatch(batch) {
    return this.sql.update(this.getTable(), batch[0]);
  }

  async prepareUpdate(data, options) {
    this.setOptions(options);
    this.ensureFields();

    this.config.forUpdate = true;

    const batches = await this.prepareRows(data);

    return Promise.all(
      batches.map(async batch => {
        const sql = this.prepareUpdateBatch(batch);
        return this.prepareSql(sql);
      })
    );
  }

  async prepareDelete(options) {
    this.setOptions(options);
    this.ensureFields();

    this.config.forDelete = true;

    const sql = this.sql.delete(this.getTable());

    return this.prepareSql(sql);
  }

  async prepareFetch(options) {
    this.setOptions(options);
    this.ensureFields();

    this.config.forFetch = true;

    const from = this.getTable();
    const sql = this.sql.select().from(from);

    return this.prepareSql(sql);
  }

  throwExecuteError(error) {
    const query = this;

    if (this.hasOption('select')) {
      throw new this.constructor.FetchError({ query, error });
    } else if (this.hasOption('insert')) {
      throw new this.constructor.InsertError({ query, error });
    } else if (this.hasOption('update')) {
      throw new this.constructor.UpdateError({ query, error });
    } else if (this.hasOption('delete')) {
      throw new this.constructor.DeleteError({ query, error });
    }
  }

  throwNoRowsError() {
    const query = this;

    if (this.hasOption('select')) {
      throw new this.constructor.NoRowsFetchedError({ query });
    } else if (this.hasOption('insert')) {
      throw new this.constructor.NoRowsInsertedError({ query });
    } else if (this.hasOption('update')) {
      throw new this.constructor.NoRowsUpdatedError({ query });
    } else if (this.hasOption('delete')) {
      throw new this.constructor.NoRowsDeletedError({ query });
    }
  }

  // TODO: strict mode: warn if a row value is undefined
  // TODO: cast fields even when they are aliased
  async parseRow(row, fields) {
    const data = fields.reduce((data, field, index) => {
      data[field] = row[index];

      return data;
    });

    return new this.Model(data).parseValues();
  }

  // depended on by knorm-relations
  async parseRows(rows, fields) {
    if (!fields.length) {
      rows = [];
    }

    if (!rows.length) {
      if (this.getOption('require')) {
        this.throwNoRowsError();
      }

      if (this.getOption('first')) {
        return null;
      }

      return rows;
    }

    return Promise.all(rows.map(row => this.parseRow(row, fields)));
  }

  /**
   * Executes a query. This method calls, in order, {@link Query#connect} to
   * connect to the database, {@link Query#formatSql} to format the SQL to be
   * queried, {@link Query#query} to run the query against the database, and
   * finally, {@link Query#disconnect} to close the database connection.
   *
   * ::: tip INFO: Usage
   * This method is used internally by all {@link Query} methods i.e.
   * {@link Query#fetch}, {@link Query#insert}, {@link Query#update} and
   * {@link Query#delete}.
   * :::
   *
   * ::: tip INFO: Query errors
   * If the promise from {@link Query#query} is rejected, the {@link QueryError}
   * is passed to {@link Query#disconnect}.
   * :::
   *
   * ::: tip INFO: Transactions
   * When queries are executed in a transaction (that has not yet
   * {@link Transaction#ended}), this method does not connect to the database
   * via {@link Query#connect}. Instead, it connects via
   * {@link Transaction#connect}. The first query to be executed in the
   * transaction causes {@link Transaction#connect} and
   * {@link Transaction#begin} to be run, after which subsequent queries re-use
   * the transaction's connection.
   *
   * In addition, the database connection is not closed after executing the
   * query. This is deferred to be handled by {@link Transaction#commit} or
   * {@link Transaction#rollback}.
   *
   * If {@link Query#query} rejects with an error, the error is passed to
   * {@link Transaction#rollback}.
   *
   * **NOTE:** once the transaction has {@link Transaction#ended}, connections
   * are established and closed as usual, via {@link Query#connect} and
   * {@link Query#disconnect}.
   * :::
   *
   * ::: tip INFO: Multiple queries
   * When the `sql` parameter is an array, a single database connection will be
   * created but {@link Query#formatSql} and {@link Query#query} will be called
   * for each item in the array.
   *
   * Also note that the queries are run in parallel (via `Promise.all`) and the
   * rows returned from each query are merged into a single array (via
   * `Array.prototype.concat`).
   * :::
   *
   * @param {SqlBricks|object|string|array} sql The SQL to run. When passed as
   * an array, it can be an array of `SqlBricks` instances, objects or strings.
   * @param {string} sql.text The parameterized SQL string (with placeholders),
   * when `sql` is passed as an object.
   * @param {array} sql.values The values for the parameterized SQL string, when
   * `sql` is passed as an object.
   *
   * @returns {Promise} A `Promise` that is resolved with an array of rows
   * returned from running the query.
   *
   * ::: tip INFO
   * If {@link Query#query} rejects with an error, the SQL that caused the error
   * is attached to the error as an `sql` property.
   * :::
   */
  async execute(sql) {
    const transaction = this.transaction;
    const transactionIsActive = transaction && !transaction.ended;

    if (transactionIsActive) {
      if (!transaction.connection) {
        await transaction.connect();
        await transaction.begin();
      }
      this.connection = transaction.connection;
    } else {
      await this.connect();
    }

    let rows;

    try {
      rows = await this.query(sql);
    } catch (e) {
      if (transactionIsActive) {
        await transaction.rollback(e);
      } else {
        await this.disconnect(e);
      }

      // TODO: remove values
      e.sql = this.getOption('debug') ? sql : { ...sql, values: undefined };

      return this.throwExecuteError(e);
    }

    if (!transactionIsActive) {
      await this.disconnect();
    }

    return rows;
  }

  /**
   * Connects to the database, via {@link Connection#create}. This method is
   * called by {@link Query#execute}.
   *
   * @returns {Promise} The `Promise` from {@link Connection#create}, that is
   * resolved when a connection is established or rejected with a
   * {@link QueryError} on error.
   */
  async connect() {
    try {
      this.connection = new this.constructor.Connection();
      return await this.connection.create();
    } catch (e) {
      throw new this.constructor.QueryError(e);
    }
  }

  /**
   * Formats SQL before it's sent to the database. This method is called
   * by {@link Query#execute} and allows manipulating or changing the SQL
   * before it's run via {@link Query#query}.
   *
   * @param {SqlBricks|object|string} sql The SQL to be formatted.
   * @param {string} sql.text The parameterized SQL string (with placeholders),
   * when `sql` is passed as an object.
   * @param {array} sql.values The values for the parameterized SQL string, when
   * `sql` is passed as an object.
   *
   * ::: tip INFO
   * This method is called internally by {@link Query#execute}.
   * :::
   *
   * @returns {object} An object with `text` and `values` properties. Note that
   * when `sql` is passed as a string, the object returned has no `values`
   * property. When an {@link SqlBricks} instance is passed, an  object is
   * returned (via [`toParams`](https://csnw.github.io/sql-bricks/#toParams)).
   */
  formatSql(sql) {
    if (typeof sql === 'string') {
      return { text: sql };
    }

    if (sql instanceof this.sql.Statement) {
      return sql.toParams();
    }

    const { text, values } = sql;
    return { text, values };
  }

  /**
   * Runs a query against the database, via {@link Connection#query}. This
   * method is called by {@link Query#execute}.
   *
   * @param {object|string} sql The SQL to be run, after it's formatted via
   * {@link Query#formatSql}.
   *
   * @returns {Promise} The `Promise` from {@link Connection#query}, that is
   * resolved with the query result or rejected with a {@link QueryError} on
   * error.
   */
  async query(sql) {
    try {
      return await this.connection.query(sql);
    } catch (e) {
      throw new this.constructor.QueryError(e);
    }
  }

  /**
   * Closes the database connection after running the query, via
   * {@link Connection#close}. This method is called by {@link Query#execute}.
   *
   * @param {QueryError} [error] A {@link QueryError} from {@link Query#query},
   * if one occurred. This error is then passed to {@link Connection#close}.
   *
   * @returns {Promise} The `Promise` from {@link Connection#close}, that is
   * resolved when the connection is closed or rejected with a
   * {@link QueryError} on error.
   */
  async disconnect(error) {
    try {
      return await this.connection.close(error);
    } catch (e) {
      throw new this.constructor.QueryError(e);
    }
  }

  prepare() {
    if (this.hasOption('select')) {
      return this.prepareSelect();
    } else if (this.hasOption('insert')) {
      return this.prepareInsert();
    } else if (this.hasOption('update')) {
      return this.prepareUpdate();
    } else if (this.hasOption('delete')) {
      return this.prepareDelete();
    }
  }

  /**
   * Fetches data from the database.
   *
   * @param {object} [options] {@link Query} options
   *
   * @returns {Promise} the promise is resolved with an array of the model's
   * instances, expect in the following cases:
   *
   * - if the {@link Query#first} query option was set to `true`, then the
   *   promise is resolved with a single model instance or `null` if no rows
   *   were inserted.
   * - if no rows were updated, then the array will be empty. If the
   *   {@link Query#require} query option was set to `true`, then the `Promise`
   *   is rejected with a {@link Query.NoRowsFetchedError} instead.
   * - if the fetch query failed, then the `Promise` is rejected with a
   *   {@link Query.FetchError} instead.
   *
   * @todo [@knorm/relations](https://github.com/knorm/relations)): throw if a
   * fetch  is attempted from a joined query
   * @todo [@knorm/relations](https://github.com/knorm/relations)): add support
   * for limit and offset options in joined queries (probably with a subquery)
   */
  async fetch(options) {
    this.setOptions({ ...options, select: true });

    const sql = this.formatSelect();
    const rows = this.execute(sql);
    const parsedRows = this.parseRows(rows, sql.fields);

    return parsedRows;
  }

  /**
   * Inserts data into the database.
   *
   * @param {Model|object|array} data The data to insert. Can be a plain object,
   * a {@link Model} instance or an array of objects or {@link Model} instances.
   * @param {object} [options] {@link Query} options
   *
   * ::: tip INFO
   * When the {@link Query#batchSize} option is set, multiple insert batches are
   * created and multiple queries are sent to the database, but on the same
   * database connection.
   * :::
   *
   * @returns {Promise} the promise is resolved with an array of the model's
   * instances, expect in the following cases:
   *
   * - if the {@link Query#first} query option was set to `true`, then the
   *   promise is resolved with a single model instance or `null` if no rows
   *   were inserted.
   * - if no rows were inserted, then the array will be empty. If the
   *   {@link Query#require} query option was set to `true`, then the `Promise`
   *   is rejected with a {@link Query.NoRowsInsertedError} instead.
   * - if the insert query failed, then the `Promise` is rejected with a
   *   {@link Query.InsertError} instead.
   *
   * @todo Add support for inserting joined models (via
   * [@knorm/relations](https://github.com/knorm/relations))
   * @todo debug/strict mode: throw/warn if data is empty
   */
  async insert(data, options) {
    if (options) {
      this.setOptions(options);
    }

    this.setOption('insert', true);

    const rows = await this.prepareRows(data);
    const batches = this.prepareBatches(rows);

    // TODO: handle batching

    return this.execute(this.formatInsert(data));
  }

  /**
   * Updates data in the database.
   *
   * ::: warning NOTE
   * When the `data` param is a single object or {@link Model} instance and the
   * {@link Query#where} option is not set, **ALL rows in the table will be
   * updated!** This mimics the behaviour of `UPDATE` queries. However, if the
   * primary field is set in the data, then only the row matching the primary
   * field is updated.
   * :::
   *
   * ::: tip INFO
   * The `data` param only works as an array in conjunction with plugins that
   * support updating multiple (ideally, in a single query) e.g.
   * [@knorm/postgres](https://github.com/knorm/postgres).
   * :::
   *
   * ::: tip INFO
   * When the {@link Query#batchSize} option is set, multiple update batches are
   * created and multiple queries are sent to the database, but on the same
   * database connection.
   * :::
   *
   * @param {Model|object|array} data The data to update. Can be a plain object,
   * a {@link Model} instance or an array of objects or instances.
   * @param {object} [options] {@link Query} options
   *
   * @returns {Promise} the promise is resolved with an array of the model's
   * instances, expect in the following cases:
   *
   * - if the {@link Query#first} query option was set to `true`, then the
   *   promise is resolved with a single model instance or `null` if no rows
   *   were inserted.
   * - if no rows were updated, then the array will be empty. If the
   *   {@link Query#require} query option was set to `true`, then the `Promise`
   *   is rejected with a {@link Query.NoRowsUpdatedError} instead.
   * - if the update query failed, then the `Promise` is rejected with a
   *   {@link Query.UpdateError} instead.
   *
   * @todo Add support for updating joined models (via
   * [@knorm/relations](https://github.com/knorm/relations))
   * @todo Update a single row when unique fields are set (in addition to
   * the primary field being set)
   * @todo debug/strict mode: throw/warn if data is empty
   */
  async update(data, options) {
    // TODO: add `by` method: which specifies which field to use for `WHERE`
    // i.e. update(data, { by: 'id' })?
    const stack = this.options.debug ? new Error().stack : undefined;
    let rows = [];

    if (!isEmpty(data)) {
      if (isObject(data)) {
        const primary = data[this.config.primary];
        if (primary !== undefined) {
          this.where({ [this.config.primary]: primary });
        }
      }

      const sqls = await this.prepareUpdate(data, options);

      rows = await this.execute(sqls).catch(error => {
        throw this._attachErrorStack(
          new this.constructor.UpdateError({ error, query: this }),
          stack
        );
      });
    }

    if (!rows.length) {
      if (this.options.require) {
        throw new this.constructor.NoRowsUpdatedError({ query: this });
      }
      return this.options.first ? null : [];
    }

    const parsedRows = this.parseRows(rows);
    return this.options.first ? parsedRows[0] : parsedRows;
  }

  /**
   * Either inserts or updates data in the database.
   *
   * ::: warning NOTE
   * When the `data` param is a single object or {@link Model} instance and the
   * {@link Query#where} option is not set, **ALL rows in the table will be
   * updated!** This mimics the behaviour of `UPDATE` queries. However, if the
   * primary field is set in the data, then only the row matching the primary
   * field is updated.
   * :::
   *
   * ::: tip INFO
   * - when the `data` param is an array, this method proxies to
   *   {@link Query#insert}.
   * - when the `data` param is an object and the primary field is **not** set,
   *   this method proxies to {@link Query#insert}. However, if the primary
   *   field is set, then the method proxies to {@link Query#update}.
   * :::
   *
   * @param {Model|object|array} data The data to update. Can be a plain object,
   * a {@link Model} instance or an array of objects or instances.
   * @param {object} [options] {@link Query} options
   */
  async save(data, options) {
    const { primary } = this.model.config;

    if (Array.isArray(data) || !primary || !data[primary]) {
      return this.insert(data, options);
    }

    return this.update(data, options);
  }

  /**
   * Deletes data from the database.
   *
   * ::: warning NOTE
   * If the {@link Query#where} option is not set, **ALL rows in the table will
   * be deleted!** This mimics the behaviour of `DELETE` queries.
   * :::
   *
   * @param {object} [options] {@link Query} options
   *
   * @returns {Promise} the promise is resolved with an array of the model's
   * instances, expect in the following cases:
   *
   * - if the {@link Query#first} query option was set to `true`, then the
   *   promise is resolved with a single model instance or `null` if no rows
   *   were inserted.
   * - if no rows were updated, then the array will be empty. If the
   *   {@link Query#require} query option was set to `true`, then the `Promise`
   *   is rejected with a {@link Query.NoRowsDeletedError} instead.
   * - if the delete query failed, then the `Promise` is rejected with a
   *   {@link Query.DeleteError} instead.
   *
   * @todo [@knorm/relations](https://github.com/knorm/relations)): add support
   * for deleting joined queries
   */
  async delete(options) {
    const stack = this.options.debug ? new Error().stack : undefined;
    const sql = await this.prepareDelete(options);
    const rows = await this.execute(sql).catch(error => {
      throw this._attachErrorStack(
        new this.constructor.DeleteError({ error, query: this }),
        stack
      );
    });

    if (!rows.length) {
      if (this.options.require) {
        throw new this.constructor.NoRowsDeletedError({ query: this });
      }
      return this.options.first ? null : [];
    }

    const parsedRows = this.parseRows(rows);
    return this.options.first ? parsedRows[0] : parsedRows;
  }

  static get where() {
    return new this.Where();
  }

  /**
   * Updates the {@link Query.Options} class. This enables adding custom query
   * options or overriding the exising query options.
   *
   * @param {Options} Options The new class, which should extend the current
   * {@link Query.Options} class.
   *
   * @returns {Query} The same {@link Query} class to allow chaining.
   */
  static updateOptions(Options) {
    /**
     * The {@link Options} class used by {@link Query} instances.
     *
     * @type {Options}
     */
    this.Options = Options;

    return this;
  }
}

module.exports = Query;

Query.updateOptions(require('./Query/Options'));

const Model = require('./Model');
const Sql = require('./Sql');
/**
 * A reference to {@link Connection}, for use within {@link Query}.
 *
 * @type {Connection}
 */
Query.Connection = require('./Connection');

/**
 * The base error that all errors thrown by {@link Query} inherit from.
 */
Query.QueryError = require('./QueryError');

/**
 * The rejection error from {@link Query#fetch} on error.
 *
 * @extends {Query.QueryError}
 */
Query.FetchError = class FetchError extends Query.QueryError {};

/**
 * The rejection error from {@link Query#insert} on error.
 *
 * @extends {Query.QueryError}
 */
Query.InsertError = class InsertError extends Query.QueryError {};

/**
 * The rejection error from {@link Query#update} on error.
 *
 * @extends {Query.QueryError}
 */
Query.UpdateError = class UpdateError extends Query.QueryError {};

/**
 * The rejection error from {@link Query#delete} on error.
 *
 * @extends {Query.QueryError}
 */
Query.DeleteError = class DeleteError extends Query.QueryError {};

/**
 * The base error for all errors thrown by {@link Query} when the
 * {@link Query#require} option is set.
 */
Query.NoRowsError = require('./NoRowsError');

/**
 * The rejection error from {@link Query#fetch} when no rows are fetched and the
 * {@link Query#require} option was set.
 *
 * @extends {Query.NoRowsError}
 */
Query.NoRowsFetchedError = class NoRowsFetchedError extends Query.NoRowsError {};

/**
 * The rejection error from {@link Query#insert} when no rows are inserted and
 * the {@link Query#require} option was set.
 *
 * @extends {Query.NoRowsError}
 */
Query.NoRowsInsertedError = class NoRowsInsertedError extends Query.NoRowsError {};

/**
 * The rejection error from {@link Query#update} when no rows are updated and
 * the {@link Query#require} option was set.
 *
 * @extends {Query.NoRowsError}
 */
Query.NoRowsUpdatedError = class NoRowsUpdatedError extends Query.NoRowsError {};

/**
 * The rejection error from {@link Query#delete} when no rows are deleted and
 * the {@link Query#require} option was set.
 *
 * @extends {Query.NoRowsError}
 */
Query.NoRowsDeletedError = class NoRowsDeletedError extends Query.NoRowsError {};

/**
 * A reference to the {@link Knorm} instance.
 *
 * ::: tip
 * This is the same instance assigned to the {@link Query.knorm} static
 * property, just added as a convenience for use in instance methods.
 * :::
 *
 * @type {Knorm}
 */
Query.prototype.knorm = null;

/**
 * A reference to the {@link Knorm} instance.
 *
 * ::: tip
 * This is the same instance assigned to the {@link Query#knorm} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Knorm}
 */
Query.knorm = null;

/**
 * The model registry. This is an object containing all the models added to the
 * ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
 * for more info.
 *
 * ::: tip
 * This is the same object assigned to the {@link Query.models} static property,
 * just added as a convenience for use in instance methods.
 * :::
 *
 * @type {object}
 */
Query.prototype.models = {};

/**
 * The model registry. This is an object containing all the models added to the
 * ORM, keyed by name. See [model registry](/guides/models.md#model-registry)
 * for more info.
 *
 * ::: tip
 * This is the same object assigned to the {@link Query#models} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {object}
 */
Query.models = {};

/**
 * For queries run within a transaction, this is reference to the
 * {@link Transaction} instance.
 *
 * ::: warning NOTE
 * This is only set for {@link Query} instances that are run within a
 * transaction, otherwise it's set to `null`.
 * :::
 *
 * ::: tip
 * This is the same instance assigned to the {@link Query.transaction} static
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Transaction}
 */
Query.prototype.transaction = null;

/**
 * For queries run within a transaction, this is reference to the
 * {@link Transaction} instance.
 *
 * ::: warning NOTE
 * This is only set for {@link Query} classes within a transaction, otherwise
 * it's set to `null`.
 * :::
 *
 * ::: tip
 * This is the same instance assigned to the {@link Query#transaction} instance
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Transaction}
 */
Query.transaction = null;
