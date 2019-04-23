const { difference } = require('lodash');

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
    // TODO: remove
    const modelConfig = Model.config;
    // TODO: remove
    const table = modelConfig.table;

    this.Model = Model;

    // TODO: remove
    this.config = {
      table,
      index: 0,
      alias: table,
      schema: modelConfig.schema,
      // primary: modelConfig.primary,
      fields: modelConfig.fields,
      // TODO: rename `fieldsToColumns` to `columns
      fieldsToColumns: modelConfig.fieldsToColumns,
      // TODO: remove `fieldNames`
      fieldNames: modelConfig.fieldNames,
      notUpdated: modelConfig.notUpdated,
      unique: modelConfig.unique
    };

    this.options = new this.constructor.Options();

    // TODO: move to Model.options.query
    const knorm = this.constructor.knorm;
    if (knorm.config.debug) {
      this.options.debug(knorm.config.debug);
    }
  }

  // TODO: add Query.prototype.reset
  // TODO: add Query.prototype.schema: set schema
  // TODO: add Query.prototype.alias: set alias - would be used by @knorm/relations

  clone() {
    // TODO: update cloning
    const clone = new this.constructor(this.Model);
    clone.config = Object.assign(clone.config, this.config);
    clone.options = Object.assign(clone.options, this.options);
    return clone;
  }

  _validateOption(option) {
    if (option.startsWith('_')) {
      // TODO: throwQueryError
      throw new this.constructor.QueryError(
        `${this.Model.name}: invalid query option \`${option}\``
      );
    }

    if (typeof this.options[option] !== 'function') {
      throw new this.constructor.QueryError(
        `${this.Model.name}: unknown query option \`${option}\``
      );
    }
  }

  setOption(option, value) {
    // TODO: add support for options scoped by method. what about "child"
    // methods such as `count`?

    this._validateOption(option);

    this.options[option](value);

    return this;
  }

  setOptions(options = {}) {
    Object.entries(options).forEach(([option, value]) => {
      this.setOption(option, value);
    });

    return this;
  }

  unsetOption(option) {
    this._validateOption(option);

    this.options[option](null);

    return this;
  }

  hasOption(option) {
    this._validateOption(option);

    return !!this.options[option];
  }

  getOptions() {
    // TODO: add support for options scoped by method

    return this.options.values;
  }

  prepareSelect(options) {
    const Sql = this.Model.Sql;
    const sqlParts = [];
    const {
      distinct,
      fields,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset,
      forUpdate,
      forShare,
      of: ofOption,
      noWait,
      skipLocked
    } = options;

    // TODO: support `with`. does it then become the pivot instead of `select`?
    // Or would `select` special case it?

    if (isOptionSet(distinct)) {
      sqlParts.push(Sql.distinct());
    }

    // TODO: support defaultFields

    if (isOptionSet(fields)) {
      sqlParts.push(Sql.fields(fields));
    }

    // TODO: support custom and multiple FROM clauses

    sqlParts.push(Sql.from());

    if (isOptionSet(where)) {
      sqlParts.push(Sql.where(where));
    }

    if (isOptionSet(groupBy)) {
      sqlParts.push(Sql.groupBy(groupBy));
    }

    if (isOptionSet(having)) {
      sqlParts.push(Sql.having(having));
    }

    if (isOptionSet(orderBy)) {
      sqlParts.push(Sql.orderBy(orderBy));
    }

    if (isOptionSet(limit)) {
      sqlParts.push(Sql.limit(limit));
    }

    if (isOptionSet(offset)) {
      sqlParts.push(Sql.offset(offset));
    }

    // TODO: FOR with a value instead? would it clash with FOR loops in Oracle?
    if (forUpdate) {
      sqlParts.push(Sql.forUpdate());
    } else if (forShare) {
      sqlParts.push(Sql.forShare());
    }

    if (isOptionSet(ofOption)) {
      sqlParts.push(Sql.of(ofOption));
    }

    if (noWait) {
      sqlParts.push(Sql.noWait());
    }

    if (skipLocked) {
      sqlParts.push(Sql.skipLocked());
    }

    return Sql.select(sqlParts);
  }

  formatSelect(options) {
    this.setOptions(options);

    const sql = this.Model.sql;
    const select = this.prepareSelect(this.getOptions());

    return {
      text: sql.formatSelect(select),
      values: sql.getValues(),
      fields: sql.getFields()
    };
  }

  prepareInsert(options) {
    const Sql = this.Model.Sql;
    const sqlParts = [];
    const { data, fields } = options;

    sqlParts.push(Sql.into());

    if (isOptionSet(data)) {
      const { columns, values } = data;

      if (columns) {
        sqlParts.push(Sql.columns(columns));
      }

      if (values) {
        sqlParts.push(Sql.values(values));
      }
    }

    // TODO: support defaultFields

    if (isOptionSet(fields)) {
      sqlParts.push(Sql.returning(fields));
    }

    return Sql.insert(sqlParts);
  }

  formatInsert(options) {
    this.setOptions(options);

    const sql = this.Model.sql;
    const insert = this.prepareInsert(this.getOptions());

    return {
      text: sql.formatInsert(insert),
      values: sql.getValues(),
      fields: sql.getFields()
    };
  }

  // TODO: maybe use something other than the dot as a separator (breaking change - @knorm/relations)
  formatFieldAlias(alias, { quote = true } = {}) {
    alias = `${this.config.alias}.${alias}`;

    return quote ? this.quote(alias) : alias;
  }

  getColumns(fields) {
    return Object.entries(fields).reduce((aliased, [alias, field]) => {
      const column = this.getColumn(field);
      alias = this.formatFieldAlias(alias);
      aliased.push(this.sql(`${column} AS ${alias}`));
      return aliased;
    }, []);
  }

  prepareGroupBy(sql, groupBy) {
    groupBy.forEach(fields => {
      if (!isArray(fields)) {
        fields = [fields];
      }
      sql.groupBy(fields.map(this.getColumn, this));
    });
  }

  // adds support for orderBy({ field: 1 }) and orderBy({ field: 'asc' })
  // TODO: strict mode: throw if order direction is unknown
  prepareOrderBy(sql, orderBy) {
    const columns = [];
    orderBy.forEach(fields => {
      if (isArray(fields)) {
        fields.forEach(field => {
          columns.push(this.getColumn(field));
        });
      } else if (isObject(fields)) {
        Object.entries(fields).forEach(([field, direction]) => {
          if (direction === 1) {
            direction = 'asc';
          } else if (direction === -1) {
            direction = 'desc';
          }
          if (direction !== 'asc' && direction !== 'desc') {
            direction = 'asc';
          }
          columns.push(this.sql(`${this.getColumn(field)} ${direction}`));
        });
      } else {
        columns.push(this.getColumn(fields));
      }
    });

    return sql.orderBy(columns);
  }

  // depended on by knorm-soft-delete
  isField(field) {
    return isString(field) && !!this.config.fieldsToColumns[field];
  }

  // depended on by knorm-soft-delete
  isWhere(field) {
    return isString(field) && field.startsWith('_$_');
  }

  getWhere(where, options = {}) {
    const [field, value, ...rest] = where;

    if (isString(field)) {
      const { type, forHaving } = options;

      if (value === undefined && type !== 'isNull' && type !== 'isNotNull') {
        throw new this.constructor.QueryError(
          `${this.Model.name}: undefined "${
            forHaving ? 'having' : 'where'
          }" value passed for field \`${field}\``
        );
      }

      // TODO: upstream `in` with an empty array to sql-bricks
      if (type === 'in' && !value.length) {
        return this.sql('$1', false);
      }

      const column = this.getColumn(field);

      // TODO: upstream `between` with an array to sql-bricks
      if (type === 'between' && isArray(value)) {
        if (!value.length) {
          throw new this.constructor.QueryError(
            `${
              this.Model.name
            }: empty array passed for "between" for field \`${field}\``
          );
        }
        return [column, ...value, ...rest];
      }

      return [column, value, ...rest];
    }

    const expressions = [];

    where.forEach(field => {
      if (field instanceof this.sql) {
        expressions.push(field);
      } else if (isObject(field)) {
        Object.entries(field).forEach(([field, value]) => {
          if (this.isWhere(field)) {
            const type = field.slice(3);
            const where = this.getWhere(
              value,
              Object.assign(options, { type })
            );
            if (where instanceof this.sql) {
              expressions.push(where);
            } else {
              expressions.push(this.sql[type].apply(this.sql, where));
            }
          } else {
            const [column] = this.getWhere([field, value], options);
            expressions.push({ [column]: value });
          }
        });
      } else {
        expressions.push(this.sql('$1', field));
      }
    });

    return expressions;
  }

  prepareWhere(sql, fields) {
    return sql.where.apply(sql, this.getWhere(fields, { forWhere: true }));
  }

  prepareHaving(sql, fields) {
    return sql.having.apply(sql, this.getWhere(fields, { forHaving: true }));
  }

  // TODO: strict mode: warn if invalid options are used depending on the method
  // e.g. using `where` for inserts
  async prepareSql(sql) {
    if (this.config.forInsert) {
      return sql;
    }

    if (this.config.forFetch && this.options.fields) {
      const columns = this.getColumns(this.options.fields);
      const method = this.options.distinct ? 'distinct' : 'select';

      sql[method](columns);
    }

    Object.entries(this.options).forEach(([option, values]) => {
      if (!values) {
        return;
      }

      if (option === 'forUpdate') {
        return sql.forUpdate();
      }

      if (option === 'noWait') {
        return sql.noWait();
      }

      if (!isArray(values) || !values.length) {
        return;
      }

      values.forEach(value => {
        switch (option) {
          case 'of':
            return sql.of(this.quote(value));

          case 'where':
            return this.prepareWhere(sql, value);

          case 'having':
            return this.prepareHaving(sql, value);

          case 'groupBy':
            return this.prepareGroupBy(sql, value);

          case 'orderBy':
            return this.prepareOrderBy(sql, value);
        }
      });
    });

    return sql;
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
  async getRow(instance) {
    let fields;

    if (this.config.forInsert) {
      instance.setDefaults();

      const notInserted = [];
      if (instance[this.config.primary] === undefined) {
        notInserted.push(this.config.primary);
      }
      fields = difference(this.config.fieldNames, notInserted);
    }

    if (this.config.forUpdate) {
      const filledFields = this.config.fieldNames.filter(
        name => instance[name] !== undefined
      );
      fields = difference(filledFields, this.config.notUpdated);
    }

    await instance.validate({ fields });

    const castFields = this.getCastFields(fields);
    if (castFields.length) {
      instance.cast({ fields: castFields, forSave: true });
    }

    const data = instance.getFieldData({ fields });

    return Object.entries(data).reduce((row, [field, value]) => {
      const column = this.getColumn(field, { format: false, quote: true });
      row[column] = this.getRowValue({ field, column, value });
      return row;
    }, {});
  }

  // TODO: strict mode: warn/throw if no data is passed
  // TODO: strict mode: warn/throw if row is empty
  async prepareData(data) {
    if (!isArray(data)) {
      data = [data];
    }

    const batches = [];
    const batchSize = this.options.batchSize;
    let currentBatch = [];
    let fieldCount;

    await Promise.all(
      data.map(async data => {
        const instance = this.getInstance(data);
        const row = await this.getRow(instance);
        const rowFieldCount = Object.values(row).length;

        if (fieldCount === undefined) {
          fieldCount = rowFieldCount;
        } else if (fieldCount !== rowFieldCount) {
          throw new this.constructor.QueryError(
            `${this.Model.name}: all objects for ${
              this.config.forUpdate ? 'update' : 'insert'
            } should have the same number of fields`
          );
        }

        if (batchSize) {
          if (currentBatch.length >= batchSize) {
            batches.push(currentBatch);
            currentBatch = [row];
          } else {
            currentBatch.push(row);
          }
        } else {
          currentBatch.push(row);
        }
      })
    );

    if (currentBatch.length) {
      batches.push(currentBatch);
    }

    return batches;
  }

  // TODO: make the default `fields` option configurable
  ensureFields() {
    if (this.options.fields === undefined) {
      this.options.fields = this.config.fieldNames.reduce((fields, field) => {
        fields[field] = field;
        return fields;
      }, {});
    }
  }

  // async prepareInsert(data, options) {
  //   this.setOptions(options);
  //   this.ensureFields();

  //   this.config.forInsert = true;

  //   const batches = await this.prepareData(data);

  //   return Promise.all(
  //     batches.map(async batch => {
  //       const sql = this.sql.insert(this.getTable(), batch).values();
  //       return this.prepareSql(sql);
  //     })
  //   );
  // }

  // TODO: v2: refactor prepareUpdateBatch => getUpdateBatch
  // depended on by knorm-postgres
  prepareUpdateBatch(batch) {
    return this.sql.update(this.getTable(), batch[0]);
  }

  async prepareUpdate(data, options) {
    this.setOptions(options);
    this.ensureFields();

    this.config.forUpdate = true;

    const batches = await this.prepareData(data);

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

  // depended on by knorm-relations
  throwFetchRequireError() {
    if (this.options.require) {
      throw new this.constructor.NoRowsFetchedError({ query: this });
    }
  }

  // depended on by knorm-relations
  getParsedRow() {
    return new this.Model();
  }

  // TODO: strict mode: warn if a row value is undefined
  // TODO: cast fields even when they are aliased (requires changes in Model)
  parseRow(row) {
    const parsedRow = this.getParsedRow(row);
    const fields = [];

    Object.keys(this.options.fields).forEach(alias => {
      const value = row[this.formatFieldAlias(alias, { quote: false })];

      if (value === undefined) {
        return;
      }

      if (this.isField(alias)) {
        fields.push(alias);
      }

      parsedRow[alias] = value;
    });

    return parsedRow.cast({ fields, forFetch: true });
  }

  // depended on by knorm-relations
  parseRows(rows) {
    if (this.options.fields === false) {
      const fakeRows = [];

      if (this.options.first) {
        fakeRows.push(null);
      }

      return fakeRows;
    }

    return rows.map(this.parseRow, this);
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
    const sqls = isArray(sql) ? sql : [sql];
    const transaction = this.transaction;
    const transactionActive = transaction && !transaction.ended;

    if (transactionActive) {
      // when running in an active transaction, use the transaction's connection
      if (!transaction.connection) {
        // in the course of a transaction, Query#execute is bound to be called
        // more than once, so ensure Transaction#connect and Transaction#begin
        // are only run once once.
        await transaction.connect();
        await transaction.begin();
      }

      this.connection = transaction.connection;
    } else {
      await this.connect();
    }

    let rows = [];
    let error;

    try {
      await Promise.all(
        sqls.map(async sql => {
          const formattedSql = this.formatSql(sql);
          let batchRows;

          try {
            batchRows = await this.query(formattedSql);
          } catch (e) {
            const { text, values } = formattedSql;

            e.sql = this.options.debug ? { text, values } : { text };
            error = e;

            throw e;
          }

          rows = rows.concat(batchRows);
        })
      );
    } finally {
      if (transactionActive) {
        if (error) {
          // if there's an active transaction and an error occurs, roll back the
          // transaction and disconnect (via Transaction#rollback)
          await transaction.rollback(error);
        }
        // if there's no error, do nothing. defer closing the connection till
        // the transaction is ended
      } else {
        await (error ? this.disconnect(error) : this.disconnect());
      }
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
      return await (error
        ? this.connection.close(error)
        : this.connection.close());
    } catch (e) {
      throw new this.constructor.QueryError(e);
    }
  }

  _attachErrorStack(error, stack) {
    if (!stack) {
      return error;
    }

    error.stack =
      error.stack.slice(0, error.stack.indexOf('\n') + 1) +
      stack.slice(stack.indexOf('\n') + 1);

    return error;
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
   *  - if the insert query failed, then the `Promise` is rejected with a
   *    {@link Query.InsertError} instead.
   *
   * @todo Add support for inserting joined models (via
   * [@knorm/relations](https://github.com/knorm/relations))
   * @todo debug/strict mode: throw/warn if data is empty
   */
  async insert(data, options) {
    const stack = this.options.debug ? new Error().stack : undefined;
    let rows = [];

    if (!isEmpty(data)) {
      const sqls = await this.prepareInsert(data, options);

      rows = await this.execute(sqls).catch(error => {
        throw this._attachErrorStack(
          new this.constructor.InsertError({ error, query: this }),
          stack
        );
      });
    }

    if (!rows.length) {
      if (this.options.require) {
        throw new this.constructor.NoRowsInsertedError({ query: this });
      }
      return this.options.first ? null : [];
    }

    const parsedRows = this.parseRows(rows);
    return this.options.first ? parsedRows[0] : parsedRows;
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
   *  - if the update query failed, then the `Promise` is rejected with a
   *    {@link Query.UpdateError} instead.
   *
   * @todo Add support for updating joined models (via
   * [@knorm/relations](https://github.com/knorm/relations))
   * @todo Update a single row when unique fields are set (in addition to
   * the primary field being set)
   * @todo debug/strict mode: throw/warn if data is empty
   */
  async update(data, options) {
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
   *  - if the fetch query failed, then the `Promise` is rejected with a
   *    {@link Query.FetchError} instead.
   *
   * @todo [@knorm/relations](https://github.com/knorm/relations)): throw if a
   * fetch  is attempted from a joined query
   * @todo [@knorm/relations](https://github.com/knorm/relations)): add support
   * for limit and offset options in joined queries (probably with a subquery)
   */
  async fetch(options) {
    const stack = this.options.debug ? new Error().stack : undefined;
    const sql = await this.prepareFetch(options);
    const rows = await this.execute(sql).catch(error => {
      throw this._attachErrorStack(
        new this.constructor.FetchError({ error, query: this }),
        stack
      );
    });

    if (!rows.length) {
      this.throwFetchRequireError();
      return this.options.first ? null : [];
    }

    const parsedRows = this.parseRows(rows);
    return this.options.first ? parsedRows[0] : parsedRows;
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
   *  - if the delete query failed, then the `Promise` is rejected with a
   *    {@link Query.DeleteError} instead.
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
