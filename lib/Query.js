const { difference } = require('lodash');
const sqlBricks = require('sql-bricks');

const isArray = Array.isArray;
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
   * @param {Model} model
   *
   * @todo use short table alias except in strict/debug mode
   */
  constructor(model) {
    if (!model) {
      throw new this.constructor.QueryError('no model provided');
    }

    if (!(model.prototype instanceof Model)) {
      throw new this.constructor.QueryError(
        'model should be a subclass of `Model`'
      );
    }

    const modelConfig = model.config;
    const table = modelConfig.table;

    if (!table) {
      throw new this.constructor.QueryError(
        `\`${model.name}.table\` is not set`
      );
    }

    const knorm = this.constructor.knorm;

    this.model = model;
    this.options = { forge: true, debug: knorm.config.debug };
    this.config = {
      table,
      index: 0,
      alias: table,
      schema: modelConfig.schema,
      primary: modelConfig.primary,
      fields: modelConfig.fields,
      fieldsToColumns: modelConfig.fieldsToColumns,
      fieldNames: modelConfig.fieldNames,
      notUpdated: modelConfig.notUpdated,
      unique: modelConfig.unique
    };
  }

  // TODO: add Query.prototype.reset
  // TODO: add Query.prototype.schema: set schema
  // TODO: add Query.prototype.alias: set alias - would be used by @knorm/relations

  clone() {
    const clone = new this.constructor(this.model);
    clone.config = Object.assign(clone.config, this.config);
    clone.options = Object.assign(clone.options, this.options);
    return clone;
  }

  setOption(option, value) {
    this.options[option] = value;

    return this;
  }

  addOption(option, value) {
    this.options[option] = this.options[option] || [];
    this.options[option].push(value);

    return this;
  }

  appendOption(option, value) {
    if (!isArray(value)) {
      value = [value];
    }

    this.options[option] = this.options[option] || [];
    this.options[option] = this.options[option].concat(...value);

    return this;
  }

  unsetOption(option) {
    this.options[option] = undefined;

    return this;
  }

  unsetOptions(options) {
    options.forEach(option => {
      this.options[option] = undefined;
    });

    return this;
  }

  getOption(option) {
    return this.options[option];
  }

  hasOption(option) {
    return this.options[option] !== undefined;
  }

  debug(debug = true) {
    return this.setOption('debug', !!debug);
  }

  require(require = true) {
    return this.setOption('require', !!require);
  }

  /**
   * Configures the batch-size for {@link Query#insert} and {@link Query#update}
   * (where batch updates are supported). When a batch-size is configured and
   * either of these operations is called with an array of data, multiple
   * queries will be sent to the database instead of a single one. If any data
   * is returned from the queries, it is merged into a single array instead of
   * returning multiple arrays.
   *
   * ::: tip INFO
   * The queries are sent to the database in parallel (i.e. via `Promise.all`).
   * Take that into consideration when deciding how many queries to send vs how
   * many items to have in a single query.
   * :::
   *
   * ::: warning NOTE
   * When using this option, the order of the items in the array returned is
   * unlikely to match the order of the rows in the original array. This is
   * because the queries are sent in parallel and are not guaranteed to complete
   * in the same order.
   * :::
   *
   * @param {number} batchSize The number of items to send in a single INSERT
   * or UPDATE query (where array updates are supported).
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  batchSize(batchSize) {
    return this.setOption('batchSize', parseInt(batchSize));
  }

  /**
   * Configures whether or not to return the first item in a result set from the
   * database from a {@link Query#fetch}, {@link Query#insert},
   * {@link Query#update} or {@link Query#delete} operation, instead of
   * returning an array. This is handy when one is sure that there's only one
   * item in the rows returned from the database.
   *
   * @param {boolean} [first=true] If `true`, return the first item, else return
   * an array.
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  first(first = true) {
    return this.setOption('first', !!first);
  }

  /**
   * Configures whether to return {@link Model} instances or plain objects from
   * a {@link Query#fetch}, {@link Query#insert}, {@link Query#update} or
   * {@link Query#delete} operation. When `forge` is `true`, items in the
   * returned array will be instances of the the {@link Model} class that is
   * passed to the {@link Query} constructor.
   *
   * ::: tip INFO
   * {@link Model} instances will be returned by default. To disable that, pass
   * `false` as the value to this option.
   * :::
   *
   * ::: tip INFO
   * This is the opposite of {@link Query#lean}.
   * :::
   *
   * @param {boolean} [forge=true] If `true`, return {@link Model} instances,
   * else return plain objects.
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  forge(forge = true) {
    return this.setOption('forge', !!forge);
  }

  /**
   * Configures whether to return {@link Model} instances or plain objects from
   * a {@link Query#fetch}, {@link Query#insert}, {@link Query#update} or
   * {@link Query#delete} operation. When `lean` is `false`, items in the
   * returned array will be instances of the the {@link Model} class that is
   * passed to the {@link Query} constructor.
   *
   * ::: tip INFO
   * {@link Model} instances will be returned by default. To disable that, pass
   * `true` as the value to this option.
   * :::
   *
   * ::: tip INFO
   * This is the opposite of {@link Query#forge}.
   * :::
   *
   * @param {boolean} [lean=true] If `true`, return plain objects, else return
   * {@link Model} instances.
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  lean(lean = true) {
    return this.setOption('forge', !lean);
  }

  // TODO: use short field aliases expect in strict/debug mode
  // TODO: strict mode: throw if the field is not a valid model field
  addFields(fields) {
    this.options.fields = this.options.fields || {};

    fields.forEach(field => {
      if (isArray(field)) {
        field.forEach(field => {
          this.options.fields[field] = field;
        });
      } else if (isObject(field)) {
        this.options.fields = Object.assign(this.options.fields, field);
      } else if (isString(field)) {
        this.options.fields[field] = field;
      }
    });

    return this;
  }

  distinct(...fields) {
    this.setOption('distinct', true);
    return this.addFields(fields);
  }

  /**
   * Configures what fields to return from a database call.
   *
   * ::: tip INFO
   * This is also aliased as {@link Query#returning}.
   * :::
   *
   * @param {string|array|object} fields The fields to return. When passed as an
   * object, the keys are used as aliases while the values are used in the
   * query. This also allows you to use raw SQL.
   *
   * @example For PostgreSQL:
   * ```js{10}
   * Model.insert(
   *   {
   *     firstName: 'Foo',
   *     lastName: 'Bar',
   *   },
   *   {
   *     returning: {
   *       firstName: 'firstName',
   *       lastName: 'lastName',
   *       fullNames: Model.query.sql(`"firstName" || ' ' || upper("lastName")`)
   *     }
   *   }
   * );
   * ```
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  fields(...fields) {
    return this.addFields(fields);
  }

  /**
   * Configures what fields to return from a database call.
   *
   * ::: tip INFO
   * This is an alias for {@link Query#fields}.
   * :::
   *
   * @param {string|array|object} fields The fields to return.
   *
   * @see {@link Query#fields}

   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  returning(...fields) {
    return this.addFields(fields);
  }

  where(...args) {
    return this.addOption('where', args);
  }

  having(...args) {
    return this.addOption('having', args);
  }

  groupBy(...groupBy) {
    return this.addOption('groupBy', groupBy);
  }

  orderBy(...orderBy) {
    return this.addOption('orderBy', orderBy);
  }

  limit(limit) {
    return this.setOption('limit', parseInt(limit));
  }

  offset(offset) {
    return this.setOption('offset', parseInt(offset));
  }

  forUpdate() {
    return this.setOption('forUpdate', true);
  }

  of(...tables) {
    return this.appendOption('of', tables);
  }

  noWait() {
    return this.setOption('noWait', true);
  }

  // TODO: add support for multiple option values i.e. array that gets transformed to var args
  // TODO: strict mode: validate option against allowed options
  setOptions(options = {}) {
    Object.keys(options).forEach(option => {
      if (typeof this[option] !== 'function') {
        throw new this.constructor.QueryError(
          `${this.model.name}: unknown option \`${option}\``
        );
      }

      this[option](options[option]);
    });

    return this;
  }

  quote(value) {
    return value;
  }

  formatTable(table, { quote = true } = {}) {
    table = quote ? this.quote(table) : table;

    if (this.config.schema) {
      const schema = quote
        ? this.quote(this.config.schema)
        : this.config.schema;
      table = `${schema}.${table}`;
    }

    return table;
  }

  // TODO: v2: remove auto-aliasing (breaking change - @knorm/relations)
  getTable({ format = true, quote = true } = {}) {
    const table = format
      ? this.formatTable(this.config.table, { quote })
      : this.config.table;

    if (this.config.table === this.config.alias) {
      return table;
    }

    const alias = format
      ? this.formatTable(this.config.alias, { quote })
      : this.config.alias;

    return this.sql(`${table} as ${alias}`);
  }

  getAlias({ format = true, quote = true } = {}) {
    const alias = format
      ? this.formatTable(this.config.alias, { quote })
      : this.config.alias;

    return alias;
  }

  formatColumn(column, { quote = true } = {}) {
    const alias = this.getAlias({ quote: true });
    column = quote ? this.quote(column) : column;

    return `${alias}.${column}`;
  }

  // TODO: strict mode: for fetches, warn if field is unknown and is not a function
  // TODO: v2: default `quote` to `true` (breaking change - @knorm/paginate)
  // TODO: v2: drop support for sql functions as raw strings and only support
  // sql bricks instances - allows us to validate field-names
  getColumn(field, { format = true, quote } = {}) {
    if (field instanceof this.sql) {
      return field;
    }

    const column = this.config.fieldsToColumns[field];

    if (!column) {
      return this.sql(field);
    }

    return format
      ? this.formatColumn(column, { quote })
      : quote
      ? this.quote(column)
      : column;
  }

  // TODO: maybe use something other than the dot as a separator (breaking change - @knorm/relations)
  formatFieldAlias(alias, { quote = true } = {}) {
    alias = `${this.config.alias}.${alias}`;

    return quote ? this.quote(alias) : alias;
  }

  // TODO: v2: remove and use formatFieldAlias (breaking change - @knorm/relations)
  formatAlias(alias, { quote } = {}) {
    alias = `${this.config.alias}.${alias}`;

    return quote ? this.quote(alias) : alias;
  }

  getColumns(fields) {
    return Object.entries(fields).reduce((aliased, [alias, field]) => {
      const column = this.getColumn(field);
      alias = this.formatFieldAlias(alias);
      aliased.push(this.sql(`${column} as ${alias}`));
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
          `${this.model.name}: undefined "${
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
              this.model.name
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
  async prepareSql(sql, options) {
    if (options.forInsert) {
      return sql;
    }

    if (options.forFetch && this.options.fields) {
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
    if (data instanceof this.model) {
      // TODO: strict mode: validate that the instance is an instance of this.model
      return data;
    }
    return new this.model(data); // eslint-disable-line new-cap
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
  async getRow(instance, options) {
    let fields;

    if (options.forInsert) {
      instance.setDefaults();

      const notInserted = [];
      if (instance[this.config.primary] === undefined) {
        notInserted.push(this.config.primary);
      }
      fields = difference(this.config.fieldNames, notInserted);
    }

    if (options.forUpdate) {
      const filledFields = this.config.fieldNames.filter(
        name => instance[name] !== undefined
      );
      fields = difference(filledFields, this.config.notUpdated);
    }

    await instance.validate({ fields });

    const castFields = this.getCastFields(fields, options);
    if (castFields.length) {
      instance.cast({ fields: castFields, forSave: true });
    }

    const data = instance.getFieldData({ fields });

    return Object.entries(data).reduce((row, [field, value]) => {
      const column = this.getColumn(field, { format: false, quote: true });
      row[column] = this.getRowValue({ field, column, value }, options);
      return row;
    }, {});
  }

  // TODO: strict mode: warn/throw if no data is passed
  // TODO: strict mode: warn/throw if row is empty
  async prepareData(data, options) {
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
        const row = await this.getRow(instance, options);
        const rowFieldCount = Object.values(row).length;

        if (fieldCount === undefined) {
          fieldCount = rowFieldCount;
        } else if (fieldCount !== rowFieldCount) {
          throw new this.constructor.QueryError(
            `${this.model.name}: all objects for ${
              options.forUpdate ? 'update' : 'insert'
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
    if (!this.options.fields) {
      this.options.fields = this.config.fieldNames.reduce((fields, field) => {
        fields[field] = field;
        return fields;
      }, {});
    }
  }

  async prepareInsert(data, options) {
    this.setOptions(options);
    this.ensureFields();

    const batches = await this.prepareData(data, { forInsert: true });

    return Promise.all(
      batches.map(async batch => {
        const sql = this.sql.insert(this.getTable(), batch).values();
        return this.prepareSql(sql, { forInsert: true });
      })
    );
  }

  // TODO: v2: refactor prepareUpdateBatch => getUpdateBatch
  // depended on by knorm-postgres
  prepareUpdateBatch(batch) {
    return this.sql.update(this.getTable(), batch[0]);
  }

  async prepareUpdate(data, options) {
    this.setOptions(options);
    this.ensureFields();

    const batches = await this.prepareData(data, { forUpdate: true });

    return Promise.all(
      batches.map(async batch => {
        const sql = this.prepareUpdateBatch(batch);
        return this.prepareSql(sql, { forUpdate: true });
      })
    );
  }

  async prepareDelete(options) {
    this.setOptions(options);
    this.ensureFields();

    const sql = this.sql.delete(this.getTable());

    return this.prepareSql(sql, { forDelete: true });
  }

  async prepareFetch(options) {
    this.setOptions(options);
    this.ensureFields();

    const from =
      this.config.table === this.config.alias
        ? this.getTable()
        : `${this.getTable()} as ${this.getAlias()}`;

    const sql = this.sql.select().from(from);

    return this.prepareSql(sql, { forFetch: true });
  }

  // depended on by knorm-relations
  throwFetchRequireError() {
    if (this.options.require) {
      throw new this.constructor.NoRowsFetchedError({ query: this });
    }
  }

  // depended on by knorm-relations
  getParsedRow() {
    // eslint-disable-next-line new-cap
    return this.options.forge ? new this.model() : {};
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

    return this.options.forge
      ? parsedRow.cast({ fields, forFetch: true })
      : parsedRow;
  }

  // depended on by knorm-relations
  parseRows(rows) {
    return rows.map(this.parseRow, this);
  }

  /**
   * Executes a query. This method calls, in order, {@link Query#connect} to
   * connect to the database, {@link Query#formatSql} to format the SQL to be
   * queried, {@link Query#query} to run the query against the database, and
   * finally, {@link Query#close} to close the database connection.
   *
   * ::: tip INFO
   * This method is used internally by all {@link Query} methods i.e.
   * {@link Query#fetch}, {@link Query#insert}, {@link Query#update} and
   * {@link Query#delete}.
   * :::
   *
   * @param {SqlBricks|object|string|array} sql The SQL to run. When passed as
   * an array, it can be an array of `SqlBricks` instances, objects or strings.
   * @param {string} sql.text The parameterized SQL string (with placeholders),
   * when `sql` is passed as an object.
   * @param {array} sql.values The values for the parameterized SQL string, when
   * `sql` is passed as an object.
   *
   * ::: tip INFO
   * When the `sql` parameter is an array, a single database connection will be
   * created but {@link Query#formatSql} and {@link Query#query} will be called
   * for each item in the array.
   * :::
   *
   * @returns {Promise} A `Promise` that is resolved with the result from
   * running the query.
   *
   * ::: tip INFO
   * If {@link Query#query} rejects with an error, the SQL that caused the error
   * is attached to the error as an `sql` property.
   * :::
   */
  async execute(sql) {
    const sqls = isArray(sql) ? sql : [sql];

    await this.connect();

    let rows = [];

    try {
      await Promise.all(
        sqls.map(async sql => {
          const formattedSql = this.formatSql(sql);
          const batchRows = await this.query(formattedSql).catch(e => {
            const { text, values } = formattedSql;
            e.sql = this.options.debug ? { text, values } : { text };
            throw e;
          });
          rows = rows.concat(batchRows);
        })
      );
    } finally {
      await this.close();
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
   * @returns {Promise} The `Promise` from {@link Connection#close}, that is
   * resolved when the connection is closed or rejected with a
   * {@link QueryError} on error.
   */
  async close() {
    try {
      return await this.connection.close();
    } catch (e) {
      throw new this.constructor.QueryError(e);
    } finally {
      this.connection = null;
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
   * - if the {@link Query#forge} query option was set to `false` (or
   *   {@link Query#lean} set to `true`), then the array will contain plain
   *   objects.
   * - if the {@link Query#first} query option was set to `true`, then the
   *   promise is resolved with a single model instance (by default) or plain
   *   object (if the {@link Query#forge} query option was set to `true`), or
   *   `null` if no rows were inserted.
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
   * @param {Model|object|array} data The data to update. Can be a plain object,
   * a {@link Model} instance or an array of objects or instances.
   * @param {object} [options] {@link Query} options
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
   * @returns {Promise} the promise is resolved with an array of the model's
   * instances, expect in the following cases:
   *
   * - if the {@link Query#forge} query option was set to `false` (or
   *   {@link Query#lean} set to `true`), then the array will contain plain
   *   objects.
   * - if the {@link Query#first} query option was set to `true`, then the
   *   promise is resolved with a single model instance (by default) or plain
   *   object (if the {@link Query#forge} query option was set to `true`), or
   *   `null` if no rows were inserted.
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
   * @param {Model|object|array} data The data to update. Can be a plain object,
   * a {@link Model} instance or an array of objects or instances.
   * @param {object} [options] {@link Query} options
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
   */
  async save(data, options) {
    if (Array.isArray(data) || data[this.config.primary] === undefined) {
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
   *  - if the {@link Query#forge} query option was set to `false` (or
   *   {@link Query#lean} set to `true`), then the array will contain plain
   *   objects.
   * - if the {@link Query#first} query option was set to `true`, then the
   *   promise is resolved with a single model instance (by default) or plain
   *   object (if the {@link Query#forge} query option was set to `true`), or
   *   `null` if no rows were inserted.
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
   * @param {object} [options] {@link Query} options
   *
   * ::: warning NOTE
   * If the {@link Query#where} option is not set, **ALL rows in the table will
   * be deleted!** This mimics the behaviour of `DELETE` queries.
   * :::
   *
   * @returns {Promise} the promise is resolved with an array of the model's
   * instances, expect in the following cases:
   *
   * - if the {@link Query#forge} query option was set to `false` (or
   *   {@link Query#lean} set to `true`), then the array will contain plain
   *   objects.
   * - if the {@link Query#first} query option was set to `true`, then the
   *   promise is resolved with a single model instance (by default) or plain
   *   object (if the {@link Query#forge} query option was set to `true`), or
   *   `null` if no rows were inserted.
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
}

module.exports = Query;

// circular deps
const Model = require('./Model');

Query.Where = require('./Where');

/**
 * A reference to {@link Connection}, for use within {@link Query}.
 *
 * @type {Connection}
 */
Query.Connection = require('./Connection');

Query.prototype.field = Query.prototype.fields;
Query.prototype.sql = Query.Where.prototype.sql = sqlBricks;

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
 * For models accessed within a transaction, this is reference to the
 * {@link Transaction} instance.
 *
 * ::: warning NOTE
 * This is only set for models that are accessed within a transaction, otherwise
 * it's set to `null`.
 * :::
 *
 * ::: tip
 * This is the same instance assigned to the {@link Query#transaction} static
 * property, just added as a convenience for use in static methods.
 * :::
 *
 * @type {Transaction}
 */
Query.prototype.transaction = null;

/**
 * For models accessed within a transaction, this is reference to the
 * {@link Transaction} instance.
 *
 * ::: warning NOTE
 * This is only set for models that are accessed within a transaction, otherwise
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
