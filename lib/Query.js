const { difference } = require('lodash');
const sqlBricks = require('sql-bricks');
const KnormError = require('./KnormError');

const isArray = Array.isArray;
const isObject = value => typeof value === 'object' && value !== null;
const isString = value => typeof value === 'string';

class Query {
  constructor(model) {
    if (!model) {
      throw new KnormError('Query: no model provided');
    }

    if (!(model.prototype instanceof this.constructor.Model)) {
      throw new KnormError('Query: model should be a subclass of `Model`');
    }

    if (!model.table) {
      throw new KnormError(`Query: \`${model.name}.table\` is not set`);
    }

    this.model = model;
    this.options = { forge: true, require: false };
    const modelConfig = model.config;
    this.config = {
      index: 0,
      table: model.table,
      // TODO: use short aliases except in strict/debug mode
      alias: model.table,
      primary: modelConfig.primary,
      fields: modelConfig.fields,
      fieldsToColumns: modelConfig.fieldsToColumns,
      columnsToFields: modelConfig.columnsToFields,
      notUpdated: modelConfig.notUpdated
    };
  }

  // TODO: add Query.prototype.reset
  // TODO: add Query.prototype.clone

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

  // TODO: strict mode: throw if field is not a valid model field
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
        throw new KnormError(`Unknown option '${option}'`);
      }
      this[option](options[option]);
    });

    return this;
  }

  getTable() {
    if (this.config.table === this.config.alias) {
      return this.quote(this.config.table);
    }

    return this.sql(
      `${this.quote(this.config.table)} as ${this.quote(this.config.alias)}`
    );
  }

  quote(value) {
    return value;
  }

  // TODO: strict mode: warn if field is unknown
  getColumn(field, { table = true } = {}) {
    let column = this.config.fieldsToColumns[field];

    if (!column) {
      return this.sql(field);
    }

    column = this.quote(column);

    if (!table) {
      return column;
    }

    return `${this.quote(this.config.alias)}.${column}`;
  }

  prepareGroupBy(query, groupBy) {
    groupBy.forEach(fields => {
      if (!isArray(fields)) {
        fields = [fields];
      }
      query.groupBy(fields.map(this.getColumn, this));
    });
  }

  // adds support for orderBy({ field: 1 }) and orderBy({ field: 'asc' })
  prepareOrderBy(query, orderBy) {
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
          columns.push(this.sql(`${this.getColumn(field)} ${direction}`));
        });
      } else {
        columns.push(this.getColumn(fields));
      }
    });

    return query.orderBy(columns);
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
      const column = this.getColumn(field);

      // TODO: this should be supported in sql-bricks
      if (type === 'between' && isArray(value)) {
        return [column, ...value, ...rest];
      }

      return [column, value, ...rest];
    }

    return where.map(field => {
      if (field instanceof this.sql) {
        return field;
      } else if (isObject(field)) {
        let expression;
        const object = {};

        Object.entries(field).forEach(([field, value]) => {
          if (this.isWhere(field)) {
            const type = field.slice(3);
            expression = this.sql[type].apply(
              this.sql,
              this.getWhere(value, { type })
            );
          } else {
            object[this.getColumn(field)] = value;
          }
        });

        return expression || object;
      } else {
        return this.sql('$1', field);
      }
    });
  }

  prepareWhere(query, fields) {
    return query.where.apply(query, this.getWhere(fields));
  }

  prepareHaving(query, fields) {
    return query.having.apply(query, this.getWhere(fields));
  }

  // TODO: use short field aliases expect in strict/debug mode
  getColumns(fields) {
    return Object.entries(fields).reduce((aliased, [alias, field]) => {
      const column = this.getColumn(field);
      alias = this.quote(`${this.config.alias}.${alias}`);
      aliased.push(this.sql(`${column} as ${alias}`));
      return aliased;
    }, []);
  }

  async prepareQuery(query, options) {
    const { forFetch } = options;

    if (forFetch && this.options.fields) {
      const columns = this.getColumns(this.options.fields);
      const method = this.options.distinct ? 'distinct' : 'select';

      query[method](columns);
    }

    ['where', 'having', 'groupBy', 'orderBy'].forEach(option => {
      const values = this.options[option];
      if (values) {
        values.forEach(value => {
          switch (option) {
            case 'where':
            case 'and':
              return this.prepareWhere(query, value);

            case 'having':
              return this.prepareHaving(query, value);

            case 'groupBy':
              return this.prepareGroupBy(query, value);

            case 'orderBy':
              return this.prepareOrderBy(query, value);
          }
        });
      }
    });

    return query;
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
    const allFields = Object.values(this.config.columnsToFields);

    if (forInsert) {
      instance.setDefaults();

      const fieldsNotToInsert = [];
      if (instance[this.config.primary] === undefined) {
        fieldsNotToInsert.push(this.config.primary);
      }
      fields = difference(allFields, fieldsNotToInsert);
    }

    if (forUpdate) {
      const filledFields = allFields.filter(
        name => instance[name] !== undefined
      );
      fields = difference(filledFields, this.config.notUpdated);
    }

    instance.cast({ fields, forSave: true });
    await instance.validate({ fields });

    const data = instance.getFieldData({ fields });

    return Object.entries(data).reduce((row, [field, value]) => {
      row[this.config.fieldsToColumns[field]] = value;
      return row;
    }, {});
  }

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
          throw new this.constructor.QueryError({
            query: this,
            error: new KnormError(
              'Query: all objects should have the same field count'
            )
          });
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
  // TODO: should the primary field be added for `distinct`?
  ensureFields() {
    if (this.options.distinct) {
      return;
    }
    if (this.options.fields) {
      this.options.fields = this.addPrimary(this.options.fields);
    } else {
      const defaultFields = Object.values(this.config.columnsToFields).reduce(
        (fields, field) => {
          fields[field] = field;
          return fields;
        },
        {}
      );
      this.options.fields = defaultFields;
    }
  }

  async prepareInsert(data, options) {
    this.setOptions(options);
    this.ensureFields();

    const batches = await this.prepareData(data, { forInsert: true });

    return Promise.all(
      batches.map(async batch => {
        const query = this.sql.insert(this.getTable(), batch).values();
        return this.prepareQuery(query, { forInsert: true });
      })
    );
  }

  // depended on by knorm-postgres
  getUpdateQuery(batch) {
    return this.sql.update(this.getTable(), batch[0]);
  }

  async prepareUpdate(data, options) {
    this.setOptions(options);
    this.ensureFields();

    const batches = await this.prepareData(data, { forUpdate: true });

    return Promise.all(
      batches.map(async batch => {
        const query = this.getUpdateQuery(batch);
        return this.prepareQuery(query, { forUpdate: true });
      })
    );
  }

  async prepareDelete(options) {
    this.setOptions(options);
    this.ensureFields();

    const query = this.sql.delete(this.getTable());

    return this.prepareQuery(query, { forDelete: true });
  }

  addPrimary(fields) {
    if (!Object.values(fields).includes(this.config.primary)) {
      fields[this.config.primary] = this.config.primary;
    }
    return fields;
  }

  async prepareFetch(options) {
    this.setOptions(options);
    this.ensureFields();

    const query = this.sql.select().from(this.getTable());

    return this.prepareQuery(query, { forFetch: true });
  }

  // depended on by knorm-relations
  throwFetchRequireError() {
    if (this.options.require) {
      throw new this.constructor.NoRowsFetchedError({ query: this });
    }
  }

  // TODO: throw if there is a field in field options whose value is undefined
  // in the row returned from the database. it should always be included in the
  // row if the query was created by us
  // NOTE: parseRow depends on the order of columns in the response matching the
  // order of fields in the query
  parseRow(row, options) {
    if (!this.options.fields) {
      return row;
    }

    // eslint-disable-next-line new-cap
    let parsedRow = this.options.forge ? new this.model() : {};

    Object.entries(this.options.fields).forEach(([alias, field]) => {
      const value = row[`${this.config.alias}.${alias}`];

      if (value === undefined) {
        return;
      }

      // depended on by knorm-relations
      if (options.parseRowValue) {
        parsedRow = options.parseRowValue({ parsedRow, value, alias, field });
      }

      parsedRow[alias] = value;
    });

    return this.options.forge ? parsedRow.cast({ forFetch: true }) : parsedRow;
  }

  // depended on by knorm-relations
  parseRows(rows, options) {
    return rows.map(row => this.parseRow(row, options));
  }

  async query() {
    throw new KnormError('Query: `Query.prototype.query` is not implemented');
  }

  // TODO: strict mode: throw if a fetch is attempted from a joined query
  // TODO: Add support for limit and offset options in joined queries
  // will probably require joining with a subquery
  async fetch(options) {
    const query = await this.prepareFetch(options);

    let rows;
    try {
      rows = await this.query(query);
    } catch (error) {
      throw new this.constructor.FetchError({ error, query: this });
    }

    if (!rows.length) {
      this.throwFetchRequireError();
      return this.options.first ? null : [];
    }

    rows = this.parseRows(rows, { forFetch: true });
    return this.options.first ? rows[0] : rows;
  }

  // TODO: add support for deleting joined queries
  async delete(options) {
    const query = await this.prepareDelete(options);

    let rows;
    try {
      rows = await this.query(query);
    } catch (error) {
      throw new this.constructor.DeleteError({ error, query: this });
    }

    if (!rows.length) {
      if (this.options.require) {
        throw new this.constructor.NoRowsDeletedError({ query: this });
      }
      return this.options.first ? null : [];
    }

    rows = this.parseRows(rows, { forDelete: true });
    return this.options.first ? rows[0] : rows;
  }

  // TODO: add support for inserting joined models
  async insert(data, options) {
    const queries = await this.prepareInsert(data, options);

    let rows = [];
    try {
      const batches = await Promise.all(
        queries.map(query => this.query(query))
      );
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

    rows = this.parseRows(rows, { forInsert: true });
    return this.options.first ? rows[0] : rows;
  }

  // TODO: add support for updating joined models
  async update(data, options) {
    const queries = await this.prepareUpdate(data, options);

    let rows = [];
    try {
      const batches = await Promise.all(
        queries.map(query => this.query(query))
      );
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

    rows = this.parseRows(rows, { forUpdate: true });
    return this.options.first ? rows[0] : rows;
  }

  async save(data, options) {
    if (Array.isArray(data) || data[this.config.primary] === undefined) {
      return this.insert(data, options);
    }

    return this.update(data, options);
  }
}

Query.prototype.field = Query.prototype.fields;
Query.prototype.sql = sqlBricks;

class Where {
  // TODO: this adds support objects for where expressions i.e.
  // `where.equal({ foo: 'bar' })`. this is only a work-around till it's
  // supported in sql-bricks v3. otherwise addOption should just be
  // `return { [`_$_${option}`]: args }`
  _objectsToExpressions(option, args) {
    const expressions = [];

    args.forEach(arg => {
      if (
        option !== 'and' && // `and` already supports objects
        option !== 'not' && // `not` already supports objects
        option !== 'or' && // `or` already supports objects
        isObject(arg) &&
        !isArray(arg) &&
        !(arg instanceof this.sql)
      ) {
        Object.entries(arg).forEach(([field, value]) => {
          if (!field.startsWith('_$_')) {
            expressions.push({ [`_$_${option}`]: [field, value] });
          }
        });
      }
    });

    return expressions;
  }

  addOption(option, args) {
    const expressions = this._objectsToExpressions(option, args);

    return expressions.length
      ? { _$_and: expressions }
      : { [`_$_${option}`]: args };
  }
}

const whereOptions = {
  and: 'and',
  or: 'or',
  not: 'not',
  equal: 'eq',
  notEqual: 'notEq',
  lessThan: 'lt',
  lessThanOrEqual: 'lte',
  greaterThan: 'gt',
  greaterThanOrEqual: 'gte',
  between: 'between',
  isNull: 'isNull',
  isNotNull: 'isNotNull',
  like: 'like',
  exists: 'exists',
  in: 'in',
  equalAll: 'eqAll',
  notEqualAll: 'notEqAll',
  lessThanAll: 'ltAll',
  lessThanOrEqualAll: 'lteAll',
  greaterThanAll: 'gtAll',
  greaterThanOrEqualAll: 'gteAll',
  equalAny: 'eqAny',
  notEqualAny: 'notEqAny',
  lessThanAny: 'ltAny',
  lessThanOrEqualAny: 'lteAny',
  greaterThanAny: 'gtAny',
  greaterThanOrEqualAny: 'gteAny',
  equalSome: 'eqSome',
  notEqualSome: 'notEqSome',
  lessThanSome: 'ltSome',
  lessThanOrEqualSome: 'lteSome',
  greaterThanSome: 'gtSome',
  greaterThanOrEqualSome: 'gteSome'
};

Object.entries(whereOptions).forEach(([option, alias]) => {
  if (!Where.prototype[option] && !Where.prototype[alias]) {
    Where.prototype[option] = function(...args) {
      return this.addOption(alias, args);
    };
    Where.prototype[alias] = Where.prototype[option];
  }
});

Where.prototype.sql = Query.prototype.sql;

Query.Where = Where;

module.exports = Query;

// circular deps
Query.Model = require('./Model');
Query.QueryError = require('./QueryError');
Query.FetchError = class FetchError extends Query.QueryError {};
Query.InsertError = class InsertError extends Query.QueryError {};
Query.UpdateError = class UpdateError extends Query.QueryError {};
Query.DeleteError = class DeleteError extends Query.QueryError {};
Query.NoRowsFetchedError = class NoRowsFetchedError extends Query.QueryError {};
Query.NoRowsInsertedError = class NoRowsInsertedError extends Query.QueryError {};
Query.NoRowsUpdatedError = class NoRowsUpdatedError extends Query.QueryError {};
Query.NoRowsDeletedError = class NoRowsDeletedError extends Query.QueryError {};
