const { difference } = require('lodash');
const sqlBricks = require('sql-bricks');

const isArray = Array.isArray;
const isObject = value => typeof value === 'object' && value !== null;
const isString = value => typeof value === 'string';
const isEmpty = value =>
  (isArray(value) && !value.length) ||
  (isObject(value) && !Object.keys(value).length);

class Query {
  // TODO: use short table alias except in strict/debug mode
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

  // depended on by knorm-postgres
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

  debug(debug = true) {
    return this.setOption('debug', !!debug);
  }

  require(require = true) {
    return this.setOption('require', !!require);
  }

  batchSize(batchSize) {
    return this.setOption('batchSize', parseInt(batchSize));
  }

  first(first = true) {
    return this.setOption('first', !!first);
  }

  forge(forge = true) {
    return this.setOption('forge', !!forge);
  }

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

  fields(...fields) {
    return this.addFields(fields);
  }

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

  // TODO: support and test `noWait`
  // mostly pending https://github.com/Suor/sql-bricks-postgres/issues/15
  // noWait() {
  //   return this.setOption('noWait', true);
  // }

  // TODO: add support for multiple option values i.e. array that gets transformed to var args
  // TODO: strict mode: validate option against allowed options
  setOptions(options = {}) {
    Object.keys(options).forEach(option => {
      if (typeof this[option] !== 'function') {
        throw new this.constructor.QueryError(`unknown option \`${option}\``);
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

  // TODO: remove auto-aliasing (breaking change - @knorm/relations)
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
  // TODO: default `quote` to `true` (breaking change - @knorm/paginate)
  getColumn(field, { format = true, quote } = {}) {
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

  // TODO: remove and use formatFieldAlias (breaking change - @knorm/relations)
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

      if (value === undefined) {
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

  async prepareSql(sql, options) {
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

  // TODO: strict mode: throw if row is empty
  async getRow(instance, { forInsert, forUpdate }) {
    let fields;

    if (forInsert) {
      instance.setDefaults();

      const notInserted = [];
      if (instance[this.config.primary] === undefined) {
        notInserted.push(this.config.primary);
      }
      fields = difference(this.config.fieldNames, notInserted);
    }

    if (forUpdate) {
      const filledFields = this.config.fieldNames.filter(
        name => instance[name] !== undefined
      );
      fields = difference(filledFields, this.config.notUpdated);
    }

    await instance.validate({ fields });
    instance.cast({ fields, forSave: true });

    const data = instance.getFieldData({ fields });

    return Object.entries(data).reduce((row, [field, value]) => {
      const column = this.getColumn(field, { format: false, quote: true });
      row[column] = value;
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

  async query() {
    throw new this.constructor.QueryError(
      '`Query.prototype.query` is not implemented'
    );
  }

  formatError(error, { stack, sql }) {
    if (sql) {
      error.sql = this.options.debug ? sql.toString() : sql.toParams().text;
    }
    if (!stack) {
      return error;
    }
    error.stack =
      error.stack.slice(0, error.stack.indexOf('\n') + 1) +
      stack.slice(stack.indexOf('\n') + 1);
    return error;
  }

  // TODO: strict mode: throw if a fetch is attempted from a joined query
  // TODO: Add support for limit and offset options in joined queries
  // will probably require joining with a subquery
  async fetch(options) {
    const stack = this.options.debug ? new Error().stack : undefined;
    const sql = await this.prepareFetch(options);
    const rows = await this.query(sql).catch(error => {
      throw this.formatError(
        new this.constructor.FetchError({ error, query: this }),
        { stack, sql }
      );
    });

    if (!rows.length) {
      this.throwFetchRequireError();
      return this.options.first ? null : [];
    }

    const parsedRows = this.parseRows(rows);
    return this.options.first ? parsedRows[0] : parsedRows;
  }

  // TODO: add support for deleting joined queries
  async delete(options) {
    const stack = this.options.debug ? new Error().stack : undefined;
    const sql = await this.prepareDelete(options);
    const rows = await this.query(sql).catch(error => {
      throw this.formatError(
        new this.constructor.DeleteError({ error, query: this }),
        { stack, sql }
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

  // TODO: add support for inserting joined models
  // TODO: debug/strict mode: throw/warn if data is empty
  async insert(data, options) {
    const stack = this.options.debug ? new Error().stack : undefined;
    let rows = [];

    if (!isEmpty(data)) {
      const sqls = await this.prepareInsert(data, options);

      await Promise.all(
        sqls.map(async sql => {
          const batch = await this.query(sql).catch(error => {
            throw this.formatError(
              new this.constructor.InsertError({ error, query: this }),
              { stack, sql }
            );
          });
          rows = rows.concat(batch);
        })
      );
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

  // TODO: add support for updating joined models
  // TODO: debug/strict mode: throw/warn if data is empty
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

      await Promise.all(
        sqls.map(async sql => {
          const batch = await this.query(sql).catch(error => {
            throw this.formatError(
              new this.constructor.UpdateError({ error, query: this }),
              { stack, sql }
            );
          });
          rows = rows.concat(batch);
        })
      );
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

  async save(data, options) {
    if (Array.isArray(data) || data[this.config.primary] === undefined) {
      return this.insert(data, options);
    }

    return this.update(data, options);
  }

  static get where() {
    return new this.Where();
  }
}

Query.Where = require('./Where');

Query.prototype.field = Query.prototype.fields;
Query.prototype.sql = Query.Where.prototype.sql = sqlBricks;

Query.QueryError = require('./QueryError');
Query.FetchError = class FetchError extends Query.QueryError {};
Query.InsertError = class InsertError extends Query.QueryError {};
Query.UpdateError = class UpdateError extends Query.QueryError {};
Query.DeleteError = class DeleteError extends Query.QueryError {};

Query.NoRowsError = require('./NoRowsError');
Query.NoRowsFetchedError = class NoRowsFetchedError extends Query.NoRowsError {};
Query.NoRowsInsertedError = class NoRowsInsertedError extends Query.NoRowsError {};
Query.NoRowsUpdatedError = class NoRowsUpdatedError extends Query.NoRowsError {};
Query.NoRowsDeletedError = class NoRowsDeletedError extends Query.NoRowsError {};

Query.knorm = Query.prototype.knorm = null;
Query.models = Query.prototype.models = {};

module.exports = Query;

// circular deps
const Model = require('./Model');
