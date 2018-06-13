const { difference } = require('lodash');
const sqlBricks = require('sql-bricks');

const isArray = Array.isArray;
const isObject = value => typeof value === 'object' && value !== null;
const isString = value => typeof value === 'string';

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

    this.model = model;
    this.options = { forge: true };
    this.config = {
      table,
      index: 0,
      alias: table,
      primary: modelConfig.primary,
      fields: modelConfig.fields,
      fieldsToColumns: modelConfig.fieldsToColumns,
      fieldNames: modelConfig.fieldNames,
      notUpdated: modelConfig.notUpdated,
      unique: modelConfig.unique
    };
  }

  // TODO: add Query.prototype.reset
  // TODO: add Query.prototype.clone
  // TODO: add Query.prototype.alias: allow setting custom aliases for queries

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

  // TODO: make `fields` and `returning` synonymns i.e. such that can use
  // `returning` in a fetch query and vice-versa

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

  // TODO: support and test this
  // forUpdate(...forUpdate) {
  //   return this.setOption('forUpdate', forUpdate);
  // }

  // TODO: support and test this
  // of(...args) {
  //   return this.addOption('of', args);
  // }

  // TODO: support and test this
  // noWait(...noWait) {
  //   return this.setOption('noWait', noWait);
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

  getTable() {
    if (this.config.table === this.config.alias) {
      return this.quote(this.config.table);
    }

    return this.sql(
      `${this.quote(this.config.table)} as ${this.quote(this.config.alias)}`
    );
  }

  // TODO: strict mode: warn if field is unknown
  getColumn(field) {
    const column = this.config.fieldsToColumns[field];

    if (!column) {
      return this.sql(field);
    }

    return `${this.quote(this.config.alias)}.${this.quote(column)}`;
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

  getWhere(where, { type } = {}) {
    const [field, value, ...rest] = where;

    if (this.isField(field)) {
      // TODO: `in` with an empty array should be supported in sql-bricks
      if (type === 'in' && !value.length) {
        return null;
      }

      const column = this.getColumn(field);

      // TODO: `between` with an array should be supported in sql-bricks
      if (type === 'between' && isArray(value)) {
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
            const where = this.getWhere(value, { type });
            if (where) {
              expressions.push(this.sql[type].apply(this.sql, where));
            }
          } else {
            expressions.push({ [this.getColumn(field)]: value });
          }
        });
      } else {
        expressions.push(this.sql('$1', field));
      }
    });

    return expressions;
  }

  prepareWhere(sql, fields) {
    return sql.where.apply(sql, this.getWhere(fields));
  }

  prepareHaving(sql, fields) {
    return sql.having.apply(sql, this.getWhere(fields));
  }

  formatAlias(alias) {
    return `${this.config.alias}.${alias}`;
  }

  getColumns(fields) {
    return Object.entries(fields).reduce((aliased, [alias, field]) => {
      const column = this.getColumn(field);
      alias = this.quote(this.formatAlias(alias));
      aliased.push(this.sql(`${column} as ${alias}`));
      return aliased;
    }, []);
  }

  async prepareSql(sql, options) {
    if (options.forFetch && this.options.fields) {
      const columns = this.getColumns(this.options.fields);
      const method = this.options.distinct ? 'distinct' : 'select';

      sql[method](columns);
    }

    ['where', 'having', 'groupBy', 'orderBy'].forEach(option => {
      const values = this.options[option];
      if (values) {
        values.forEach(value => {
          switch (option) {
            case 'where':
            case 'and':
              return this.prepareWhere(sql, value);

            case 'having':
              return this.prepareHaving(sql, value);

            case 'groupBy':
              return this.prepareGroupBy(sql, value);

            case 'orderBy':
              return this.prepareOrderBy(sql, value);
          }
        });
      }
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
      row[this.quote(this.config.fieldsToColumns[field])] = value;
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
            'all objects should have the same field count'
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

    const sql = this.sql.select().from(this.getTable());

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

  // TODO: throw if there is a field in field options whose value is undefined
  // in the row returned from the database. it should always be included in the
  // row if the query was created by us
  parseRow(row) {
    const parsedRow = this.getParsedRow(row);

    Object.keys(this.options.fields).forEach(alias => {
      const value = row[this.formatAlias(alias)];

      if (value === undefined) {
        return;
      }

      parsedRow[alias] = value;
    });

    return this.options.forge ? parsedRow.cast({ forFetch: true }) : parsedRow;
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

  // TODO: strict mode: throw if a fetch is attempted from a joined query
  // TODO: Add support for limit and offset options in joined queries
  // will probably require joining with a subquery
  async fetch(options) {
    const sql = await this.prepareFetch(options);

    let rows;
    try {
      rows = await this.query(sql);
    } catch (error) {
      throw new this.constructor.FetchError({ error, query: this });
    }

    if (!rows.length) {
      this.throwFetchRequireError();
      return this.options.first ? null : [];
    }

    rows = this.parseRows(rows);
    return this.options.first ? rows[0] : rows;
  }

  // TODO: add support for deleting joined queries
  async delete(options) {
    const sql = await this.prepareDelete(options);

    let rows;
    try {
      rows = await this.query(sql);
    } catch (error) {
      throw new this.constructor.DeleteError({ error, query: this });
    }

    if (!rows.length) {
      if (this.options.require) {
        throw new this.constructor.NoRowsDeletedError({ query: this });
      }
      return this.options.first ? null : [];
    }

    rows = this.parseRows(rows);
    return this.options.first ? rows[0] : rows;
  }

  // TODO: add support for inserting joined models
  async insert(data, options) {
    const sqls = await this.prepareInsert(data, options);

    let rows = [];
    try {
      // TODO: await Promise.all(sqls.map(this.query, this));
      const batches = await Promise.all(sqls.map(sql => this.query(sql)));
      batches.forEach(batch => {
        rows = rows.concat(batch);
      });
    } catch (error) {
      throw new this.constructor.InsertError({ error, query: this });
    }

    if (!rows.length) {
      if (this.options.require) {
        throw new this.constructor.NoRowsInsertedError({ query: this });
      }
      return this.options.first ? null : [];
    }

    rows = this.parseRows(rows);
    return this.options.first ? rows[0] : rows;
  }

  // TODO: add support for updating joined models
  async update(data, options) {
    if (!isArray(data)) {
      const primary = data[this.config.primary];
      if (primary !== undefined) {
        this.where({ [this.config.primary]: primary });
      }
    }

    const sqls = await this.prepareUpdate(data, options);

    let rows = [];
    try {
      // TODO: await Promise.all(sqls.map(this.query, this));
      const batches = await Promise.all(sqls.map(sql => this.query(sql)));
      batches.forEach(batch => {
        rows = rows.concat(batch);
      });
    } catch (error) {
      throw new this.constructor.UpdateError({ error, query: this });
    }

    if (!rows.length) {
      if (this.options.require) {
        throw new this.constructor.NoRowsUpdatedError({ query: this });
      }
      return this.options.first ? null : [];
    }

    rows = this.parseRows(rows);
    return this.options.first ? rows[0] : rows;
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

module.exports = Query;

// circular deps
const Model = require('./Model');
