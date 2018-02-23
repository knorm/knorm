const { camelCase } = require('lodash');
const KnexRaw = require('knex/lib/raw');
const KnexQueryBuilder = require('knex/lib/query/builder');
const WithKnex = require('./WithKnex');

class Query extends WithKnex {
  constructor(model) {
    super();

    if (!model) {
      throw new Error('Query requires a Model class');
    }

    if (!(model.prototype instanceof this.constructor.Model)) {
      throw new Error('Query requires a subclass of Model');
    }

    if (!model.table) {
      throw new Error(`'${model.name}.table' is not configured`);
    }

    this.index = 0;
    this.model = model;
    this.table = model.table;
    this.alias = model.table;

    const modelConfig = model.config;
    this.references = modelConfig.references;
    this.modelFields = modelConfig.fields;
    this.fieldsToColumns = modelConfig.fieldsToColumns;
    this.columnsToFields = modelConfig.columnsToFields;
    this.notUpdated = modelConfig.notUpdated.reduce((fields, field) => {
      fields[field] = true;
      return fields;
    }, {});
    this.fieldNames = Object.values(this.columnsToFields);

    this.primary = modelConfig.primary;
    this.parsedRows = {};
    this.options = { forge: true, require: false };
    this.builderOptions = {};
    this.queriesByAlias = {};
    this.knex = this.constructor.knex;
    this.builder = this.knex(this.table);
  }

  field(field) {
    this.options.field = field;
    return this;
  }

  fields(...fields) {
    return this.appendBuilderOptionValue('columns', fields);
  }

  // orderBy is special-cased to support orderBy({ field: 1 })
  // TODO: test orderBy with string args: .orderBy('foo', 'asc')
  orderBy(...orderBy) {
    if (isObject(orderBy[0])) {
      Object.keys(orderBy[0]).forEach(field => {
        let direction = orderBy[0][field];
        if (direction === 1) {
          direction = 'asc';
        } else if (direction === -1) {
          direction = 'desc';
        }
        this.appendBuilderOption('orderBy', [field, direction]);
      });
    } else {
      this.appendBuilderOptionValue('orderBy', orderBy);
    }

    return this;
  }

  _join(type, queries, options) {
    if (!isArray(queries)) {
      queries = [queries];
    }

    this.options.joins = this.options.joins || [];

    queries.forEach(query => {
      if (query.prototype instanceof this.constructor.Model) {
        query = query.query;
      }

      const forwardReferences = query.references[this.model.name];
      const reverseReferences = this.references[query.model.name];

      if (!forwardReferences && !reverseReferences) {
        throw new Error(
          `'${this.model.name}' has no references to '${query.model.name}'`
        );
      }

      query.parent = this;
      query.isJoined = true;
      query.joinType = type;
      query.forwardReferences = forwardReferences;
      query.reverseReferences = reverseReferences;

      query.setOptions(options);

      this.options.joins.push(query);
    });

    return this;
  }

  leftJoin(queries, options) {
    return this._join('leftJoin', queries, options);
  }

  innerJoin(queries, options) {
    return this._join('innerJoin', queries, options);
  }

  join(...args) {
    return this.innerJoin(...args);
  }

  // TODO: knex now supports forUpdate and forShare without a transaction
  transaction(transaction, options) {
    let forUpdate;
    let forShare;

    if (isObject(transaction)) {
      forUpdate = transaction.forUpdate;
      forShare = transaction.forShare;
      transaction = transaction.transaction;
    } else if (options) {
      forUpdate = options.forUpdate;
      forShare = options.forShare;
    }

    this.setBuilderOptionValue('transacting', transaction);

    if (forUpdate) {
      this.setBuilderOptionValue('forUpdate', forUpdate);
    }
    if (forShare) {
      this.setBuilderOptionValue('forShare', forShare);
    }

    return this;
  }

  setOptions(options = {}) {
    Object.keys(options).forEach(option => {
      if (typeof this[option] !== 'function') {
        throw new Error(`Unknown option '${option}'`);
      }
      // TODO: strict mode: validate option against allowed options
      this[option](options[option]);
    });

    return this;
  }

  require(require = true) {
    this.options.require = !!require;
    return this;
  }

  batchSize(batchSize) {
    this.options.batchSize = parseInt(batchSize);
    return this;
  }

  first(first = true) {
    this.options.first = !!first;
    return this;
  }

  forge(forge = true) {
    this.options.forge = !!forge;
    return this;
  }

  lean(lean = true) {
    this.options.forge = !lean;
    return this;
  }

  // TODO: find another name that doesn't clash with query builder's .as()
  as(as) {
    this.options.as = as;
    return this;
  }

  // TODO: this doesn't support a formatted field nor does it support columns
  on(...fields) {
    this.options.on = this.options.on || [];
    this.options.on.push(...fields);
    return this;
  }

  setBuilderOptionValue(option, value) {
    this.builderOptions[option] = [[value]];
  }

  appendBuilderOptionValue(option, value) {
    this.builderOptions[option] = this.builderOptions[option] || [];
    this.builderOptions[option].push(value);
    return this;
  }

  isFormatted(field) {
    return field.includes('.');
  }

  formatAlias(alias) {
    if (this.isFormatted(alias)) {
      return alias;
    }
    return `${this.alias}.${alias}`;
  }

  // TODO: does the dot separator work for all dialects?
  // TODO: does the 'field as alias' pattern work for all dialects?
  // TODO: test with aliased columns: `foo as bar`, `foo AS bar`
  // TODO: use query-builder events or hack around query-builder._statements for this stuff
  // TODO: strict mode: throw field is not a valid field or column name
  // TODO: does the 'field as alias' pattern work for all dialects?
  // TODO: test with aliased field names
  formatField(field, options) {
    if (field === '*' || this.isFormatted(field)) {
      return field;
    }

    let alias;

    const index = field.toLowerCase().indexOf(' as ');
    if (index > -1) {
      alias = this.formatAlias(field.slice(index + 4));
      field = field.slice(0, index);
    }

    const column = this.fieldsToColumns[field];
    if (column) {
      if (options.alias && !alias) {
        alias = `${this.alias}.${field}`;
      }
      field = `${this.alias}.${column}`;
    }

    if (alias) {
      field = `${field} as ${alias}`;
    }

    return field;
  }

  // TODO: handle functions .where(function (qb) { qb.where('foo', '=', 'bar'); });
  formatFields(fields, options) {
    if (!isArray(fields)) {
      fields = [fields];
    }

    return fields.map(field => {
      if (typeof field === 'string') {
        return this.formatField(field, options);
      }

      if (field instanceof KnexRaw || field instanceof KnexQueryBuilder) {
        return field;
      }

      if (isObject(field)) {
        return Object.keys(field).reduce((obj, key) => {
          if (options.alias) {
            obj[this.formatAlias(key)] = this.formatField(field[key], {
              alias: false
            });
          } else {
            obj[this.formatField(key, options)] = field[key];
          }
          return obj;
        }, {});
      }

      return field;
    });
  }

  // TODO: knex: request access to builder._statements
  formatBuilderValues() {
    const statements = this.builder._statements;
    if (!statements || !statements.length) {
      return;
    }

    // console.log(require('util').inspect({ statements }, false, null));

    statements.forEach(statement => {
      const { grouping } = statement;

      if (grouping === 'columns' && statement.value) {
        statement.value = this.formatFields(statement.value, { alias: true });
      } else if (grouping === 'where' && statement.column) {
        statement.column = this.formatField(statement.column, { alias: false });
      }
    });
  }

  prepareBuilderOption(option, values, options) {
    if (option === 'distinct' && options.forCount) {
      return;
    }

    // console.log({ option, values });

    values.forEach(value => {
      if (isArray(value)) {
        this.builder[option].apply(this.builder, value);
      } else {
        this.builder[option].call(this.builder, value);
      }
    });
  }

  prepareBuilderOptions(options) {
    Object.keys(this.builderOptions).forEach(option => {
      this.prepareBuilderOption(option, this.builderOptions[option], options);
    });
  }

  async prepareJoins(options) {
    await Promise.all(
      this.options.joins.map(async query => {
        query.builder = this.builder;
        query.index = ++this.index;
        query.alias = `${query.alias}_${query.index}`;

        this.queriesByAlias[query.alias] = query;

        let references = [];
        const isForwardReference = !!query.forwardReferences;

        if (query.options.on) {
          if (isForwardReference) {
            query.options.on.forEach(field =>
              references.push(query.forwardReferences[field])
            );
          } else {
            const referencesByTo = Object.values(
              query.reverseReferences
            ).reduce((references, from) => {
              const to = from.references.name;
              references[to] = references[to] || [];
              references[to].push(from);
              return references;
            }, {});
            query.options.on.forEach(field =>
              references.push(...referencesByTo[field])
            );
          }
        } else {
          references = Object.values(
            query.forwardReferences || query.reverseReferences
          );
        }

        const on = references.reduce((columns, field) => {
          const fromColumn = field.column;
          const toColumn = field.references.column;

          if (isForwardReference) {
            // TODO: use formatField here
            columns[`${query.alias}.${fromColumn}`] = `${
              this.alias
            }.${toColumn}`;
          } else {
            // TODO: use formatField here
            columns[`${query.alias}.${toColumn}`] = `${
              this.alias
            }.${fromColumn}`;
          }

          return columns;
        }, {});

        const method = query.joinType || 'leftJoin';
        this.builder[method](`${query.table} as ${query.alias}`, on);

        if (!query.options.as) {
          query.options.as = camelCase(query.model.name);
        }

        return query.prepareBuilder(options);
      })
    );
  }

  async prepareCount() {
    if (this.builderOptions.distinct) {
      const distinct = this.builderOptions.distinct.reduce(
        (flattened, value) => {
          flattened = flattened.concat(...value);
          return flattened;
        },
        []
      );
      // TODO: remove after https://github.com/tgriesser/knex/pull/2449
      if (distinct.length > 1) {
        throw new Error('Cannot count multiple distinct fields');
      }
      this.builder.countDistinct(
        this.formatField(distinct[0], { alias: false })
      );
    } else if (this.options.field) {
      this.builder.count(
        this.formatField(this.options.field, { alias: false })
      );
    } else {
      this.builder.count();
    }

    this.builder.limit(1);
  }

  // TODO: strict mode: throw if data is not an array (for inserts) nor an object
  // TODO: strict mode: throw if instance is not an instance of this.model
  _getInstance(data) {
    if (data instanceof this.model) {
      return data;
    }
    return new this.model(data);
  }

  // TODO: strict mode: throw if row is empty
  async _getRow(instance, { forInsert, forUpdate }) {
    const row = {};

    if (forInsert) {
      instance.setDefaults();
    }

    await Promise.all(
      this.fieldNames.map(async fieldName => {
        if (forUpdate && this.notUpdated[fieldName]) {
          return;
        }

        const value = instance[fieldName];
        const valueIsUndefined = value === undefined;

        if (valueIsUndefined) {
          if (forInsert && fieldName === this.primary) {
            return;
          }
          if (forUpdate) {
            return;
          }
        }

        const field = this.modelFields[fieldName];

        await field.validate(value, instance);

        if (valueIsUndefined) {
          return;
        }

        const column = this.fieldsToColumns[fieldName];
        const castValue = field.cast(value, instance, { forSave: true });

        if (castValue !== undefined) {
          instance[fieldName] = castValue;
          row[column] = castValue;
        } else {
          row[column] = value;
        }
      })
    );

    return row;
  }

  async prepareInsert(options) {
    const rows = [];
    const instances = [];
    const prepareData = async data => {
      const instance = this._getInstance(data);
      const row = await this._getRow(instance, options);

      instances.push(instance);
      rows.push(row);
    };

    const { data } = options;

    if (Array.isArray(data)) {
      await Promise.all(data.map(prepareData));
    } else {
      await prepareData(data);
    }

    const builders = [];

    if (this.options.batchSize) {
      let current = 0;
      while (current < rows.length) {
        const batch = rows.slice(current, current + this.options.batchSize);
        builders.push(this.builder.clone().insert(batch));
        current += this.options.batchSize;
      }
    } else {
      builders.push(this.builder.insert(rows));
    }

    this.options.forge = false;

    return { instances, builders };
  }

  async prepareUpdate(options) {
    const instance = this._getInstance(options.data);
    const row = await this._getRow(instance, options);

    this.builder.update(row);
  }

  async prepareDelete() {
    this.builder.delete();
  }

  // TODO: Add support for limit and offset options in joined queries
  // will probably require joining with a subquery
  async prepareFetch() {
    this.builder.select();

    if (this.options.first) {
      this.builder.limit(1);
    }
  }

  getDefaultBuilderOptionValue(option) {
    switch (option) {
      case 'columns':
        // TODO: this should be '*' but fieldNames are needed for joins
        return this.fieldNames;

      case 'returning':
        return '*';
    }
  }

  setDefaultBuilderOptionValue(option) {
    const value = this.getDefaultBuilderOptionValue(option);
    if (value) {
      this.setBuilderOptionValue(option, value);
    }
  }

  // TODO: add support for DBs that don't have support for RETURNING
  // TODO: `returning` is special-cased to allow calling it multiple times
  // with different values (not supported in knex)
  async prepareBuilder(options) {
    const { forInsert, forUpdate, forDelete, forFetch, forCount } = options;

    if (forInsert || forUpdate || forDelete) {
      if (this.builderOptions.returning) {
        const returning = this.builderOptions.returning.reduce(
          (flattened, value) => {
            flattened = flattened.concat(...value);
            return flattened;
          },
          [this.primary]
        );
        this.setBuilderOptionValue('returning', returning);
      } else {
        this.setDefaultBuilderOptionValue('returning');
      }
    }

    if (forFetch) {
      if (!this.builderOptions.distinct) {
        if (this.builderOptions.columns) {
          this.appendBuilderOptionValue('columns', this.primary);
        } else {
          this.setDefaultBuilderOptionValue('columns');
        }
      }
    }

    this.prepareBuilderOptions(options);
    this.formatBuilderValues(options);

    if (this.options.joins) {
      await this.prepareJoins(options);
    }

    if (forCount) {
      return this.prepareCount(options);
    }

    if (forFetch) {
      return this.prepareFetch(options);
    }

    if (forInsert) {
      return this.prepareInsert(options);
    }

    if (forUpdate) {
      return this.prepareUpdate(options);
    }

    if (forDelete) {
      return this.prepareDelete(options);
    }
  }

  async count(options) {
    this.setOptions(options);
    await this.prepareBuilder({ forCount: true });

    let rows;
    try {
      rows = await this.builder.then();
    } catch (error) {
      throw new this.constructor.CountError({ error, query: this });
    }

    // TODO: the count alias won't work on all dialects
    const count = parseInt(rows[0].count);

    if (!count && this.options.require) {
      throw new this.constructor.NoRowsCountedError({ query: this });
    }

    return count;
  }

  throwFetchRequireError() {
    if (this.options.require) {
      throw new this.constructor.NoRowsFetchedError({ query: this });
    }

    if (this.options.joins) {
      this.options.joins.forEach(query => query.throwFetchRequireError());
    }
  }

  parseRow(row, options) {
    const { instance, isNested, mergeRows } = options;
    const forgeRow = this.options.forge;
    const isForged = instance || forgeRow;

    const keys = Object.keys(row);
    let parsedRow = instance ? instance : forgeRow ? new this.model() : {};

    if (isNested) {
      if (!keys.length) {
        return null;
      }

      if (!isForged) {
        parsedRow._knorm = {};
      }

      parsedRow._knorm.allFieldsNull = true;
    }

    keys.forEach(key => {
      // TODO: does the dot separator work for all dialects?
      const tableColumnPair = key.split('.');

      let table;
      let column;

      if (tableColumnPair[1]) {
        table = tableColumnPair[0];
        column = tableColumnPair[1];
      } else {
        table = this.alias;
        column = key;
      }

      if (table === this.alias) {
        const value = row[key];
        // TODO: strict mode: throw if the key is not a known column-name
        const field = this.columnsToFields[column] || column;

        if (field === this.primary && value && mergeRows) {
          if (this.parsedRows[value]) {
            parsedRow = this.parsedRows[value];
          } else {
            this.parsedRows[value] = parsedRow;
          }
        }

        if (isNested && value !== null && parsedRow._knorm.allFieldsNull) {
          parsedRow._knorm.allFieldsNull = false;
        }

        parsedRow[field] = value;
        delete row[key]; // to optimise performance of nested parseRow calls
      } else if (this.queriesByAlias[table]) {
        const nestedData = this.queriesByAlias[table].parseRow(
          row,
          Object.assign({ isNested: true }, options)
        );
        if (nestedData) {
          const as = this.queriesByAlias[table].options.as;
          parsedRow[as] = parsedRow[as]
            ? [parsedRow[as], nestedData]
            : nestedData;
        }
      }
    });

    if (isNested) {
      if (parsedRow._knorm.allFieldsNull) {
        return null;
      }
      if (!isForged) {
        delete parsedRow._knorm.allFieldsNull;
      }
    }

    return isForged ? parsedRow.cast({ forFetch: true }) : parsedRow;
  }

  parseRows(rows, options) {
    rows = rows.map(row => this.parseRow(row, options));

    if (options.mergeRows) {
      const parsedRows = Object.values(this.parsedRows);
      if (parsedRows.length) {
        rows = parsedRows;
      }
    }

    return rows;
  }

  // TODO: strict mode: throw if a fetch is attempted from a joined query
  async fetch(options) {
    this.setOptions(options);
    await this.prepareBuilder({ forFetch: true });

    console.log(this.builder.toSQL());

    let rows;
    try {
      rows = await this.builder.then();
    } catch (error) {
      throw new this.constructor.FetchError({ error, query: this });
    }

    if (!rows.length) {
      this.throwFetchRequireError();
      return this.options.first ? null : [];
    }

    rows = this.parseRows(rows, {
      forFetch: true,
      mergeRows: !!this.options.joins
    });
    return this.options.first ? rows[0] : rows;
  }

  // TODO: add support for deleting joined queries
  async delete(options) {
    this.setOptions(options);
    await this.prepareBuilder({ forDelete: true });

    let rows;
    try {
      rows = await this.builder.then();
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
    this.setOptions(options);
    const { instances, builders } = await this.prepareBuilder({
      data,
      forInsert: true
    });

    let rows = [];
    try {
      const batches = await Promise.all(
        builders.map(async builder => builder.then())
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

    rows = rows.map((row, index) =>
      this.parseRow(row, {
        forInsert: true,
        instance: instances[index]
      })
    );
    return this.options.first ? rows[0] : rows;
  }

  // TODO: add support for updating joined models
  async update(data, options) {
    this.setOptions(options);
    await this.prepareBuilder({ data, forUpdate: true });

    let rows;
    try {
      rows = await this.builder.then();
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
    if (Array.isArray(data) || data[this.primary] === undefined) {
      return this.insert(data, options);
    }

    return this.update(data, options);
  }

  // TODO: add support for re-using Query instances i.e. Query.prototype.reset
}

const isObject = value => typeof value === 'object' && value !== null;
const isArray = Array.isArray;

module.exports = Query;

Query.Model = require('./Model');
Query.QueryError = require('./QueryError');
Query.CountError = class CountError extends Query.QueryError {};
Query.FetchError = class FetchError extends Query.QueryError {};
Query.InsertError = class InsertError extends Query.QueryError {};
Query.UpdateError = class UpdateError extends Query.QueryError {};
Query.DeleteError = class DeleteError extends Query.QueryError {};
Query.NoRowsCountedError = class NoRowsCountedError extends Query.QueryError {};
Query.NoRowsFetchedError = class NoRowsFetchedError extends Query.QueryError {};
Query.NoRowsInsertedError = class NoRowsInsertedError extends Query.QueryError {};
Query.NoRowsUpdatedError = class NoRowsUpdatedError extends Query.QueryError {};
Query.NoRowsDeletedError = class NoRowsDeletedError extends Query.QueryError {};

const builderOptions = [
  // 'with',
  // 'withSchema',
  // 'table',
  // 'from',
  // 'into',
  // 'transacting',
  // 'forUpdate',
  // 'forShare',
  'columns',
  'returning',
  'distinct',
  'where',
  'orWhere',
  'whereNot',
  'orWhereNot',
  'whereRaw',
  'orWhereRaw',
  'whereExists',
  'orWhereExists',
  'whereNotExists',
  'orWhereNotExists',
  'whereIn',
  'orWhereIn',
  'whereNotIn',
  'orWhereNotIn',
  'whereNull',
  'orWhereNull',
  'whereNotNull',
  'orWhereNotNull',
  'whereBetween',
  'whereNotBetween',
  'orWhereBetween',
  'orWhereNotBetween',
  'groupBy',
  'groupByRaw',
  'orderBy',
  'orderByRaw',
  'having',
  'orHaving',
  'havingNull',
  'orHavingNull',
  'havingNotNull',
  'orHavingNotNull',
  'havingExists',
  'orHavingExists',
  'havingNotExists',
  'orHavingNotExists',
  'havingBetween',
  'orHavingBetween',
  'havingNotBetween',
  'orHavingNotBetween',
  'havingIn',
  'orHavingIn',
  'havingNotIn',
  'orHavingNotIn',
  'havingRaw',
  'orHavingRaw',
  'offset',
  'limit',
  'min',
  'max',
  'sum',
  'avg',
  'countDistinct',
  'sumDistinct',
  'avgDistinct',
  'increment',
  'decrement',
  'pluck',
  'column',
  'andWhereNot',
  'andWhere',
  'andWhereRaw',
  'andWhereBetween',
  'andWhereNotBetween',
  'andHaving',
  'andHavingIn',
  'andHavingNotIn',
  'andHavingNull',
  'andHavingNotNull',
  'andHavingExists',
  'andHavingNotExists',
  'andHavingBetween',
  'andHavingNotBetween'
];

builderOptions.forEach(option => {
  if (!Query.prototype[option]) {
    Query.prototype[option] = function(...args) {
      return this.appendBuilderOptionValue(option, args);
    };
  }
});
