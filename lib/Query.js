const { camelCase } = require('lodash');
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
    this.options = {
      on: [],
      joins: [],
      forge: true,
      require: false
    };
    this.builderOptions = {
      columns: [[this.primary]],
      returning: [[this.primary]]
    };
    this.queriesByAlias = {};
    this.knex = this.constructor.knex;
    this.builder = this.knex(this.table);
    this.operators = operators.reduce((operators, operator) => {
      operators[operator] = true;
      return operators;
    }, {});
  }

  field(field) {
    this.options.field = field;
    return this;
  }

  fields(...fields) {
    return this.addBuilderOption('columns', fields);
  }

  // TODO: `returning` is special-cased to allow calling it multiple times with
  // different values (not supported in knex)
  returning(...fields) {
    return this.addBuilderOption('returning', fields, { merge: true });
  }

  // orderBy is special-cased to support orderBy({ field: 1 })
  orderBy(...orderBy) {
    if (isObject(orderBy[0])) {
      Object.keys(orderBy[0]).forEach(field => {
        let direction = orderBy[0][field];
        if (direction === 1) {
          direction = 'asc';
        } else if (direction === -1) {
          direction = 'desc';
        }
        this.addBuilderOption('orderBy', [field, direction]);
      });
    } else {
      this.addBuilderOption('orderBy', orderBy);
    }

    return this;
  }

  _join(type, queries, options) {
    if (!isArray(queries)) {
      queries = [queries];
    }

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

    this.builderOptions.transacting = [[transaction]];
    if (forUpdate) {
      this.builderOptions.forUpdate = [[forUpdate]];
    }
    if (forShare) {
      this.builderOptions.forShare = [[forShare]];
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
    this.options.on.push(...fields);
    return this;
  }

  addBuilderOption(option, value, { merge } = {}) {
    if (!this.builderOptions[option]) {
      this.builderOptions[option] = [value];
    } else {
      const builderOption = this.builderOptions[option];
      if (merge) {
        builderOption[0] = builderOption[0].concat(...value);
      } else {
        builderOption.push(value);
      }
    }

    return this;
  }

  _isAliased(field) {
    return field.includes(`${this.table}.`) || field.includes(`${this.alias}.`);
  }

  _formatAlias(alias) {
    if (this._isAliased(alias)) {
      return alias;
    }
    return `${this.alias}.${alias}`;
  }

  _formatFieldName(fieldName, { alias = true } = {}) {
    // TODO: does the dot separator work for all dialects?
    // TODO: does the 'field as alias' pattern work for all dialects?
    let formatted = `${this.alias}.${this.fieldsToColumns[fieldName]}`;
    if (alias) {
      formatted += ` as ${this.alias}.${fieldName}`;
    }
    return formatted;
  }

  _isOperator(identifier) {
    return !!this.operators[identifier];
  }

  // TODO: test with aliased columns: `foo as bar`, `foo AS bar`
  formatFieldName(field, options) {
    if (this._isAliased(field) || this._isOperator(field)) {
      return field;
    }

    let alias;
    // TODO: does the 'field as alias' pattern work for all dialects?
    const index = field.toLowerCase().indexOf(' as ');
    // TODO: test with aliased field names
    if (index > -1) {
      alias = field.slice(index + 4);
      field = field.slice(0, index);
    }

    // TODO: strict mode: throw field is not a valid field or column name
    if (this.fieldsToColumns[field]) {
      if (alias) {
        options = Object.assign({}, options, { alias: false });
      }
      field = this._formatFieldName(field, options);
    }

    if (alias) {
      field = `${field} as ${this._formatAlias(alias)}`;
    }

    return field;
  }

  formatBuilderOptionValue(option, value, { alias }) {
    if (typeof value === 'string') {
      return this.formatFieldName(value, { alias });
    }

    if (isArray(value)) {
      // TODO: do not format string values e.g. .where('foo', '=', 'bar')
      return value.map(
        value =>
          typeof value === 'string'
            ? this.formatFieldName(value, { alias })
            : value
      );
    }

    if (isObject(value)) {
      return Object.keys(value).reduce((obj, key) => {
        if (alias) {
          obj[this._formatAlias(key)] = this.formatFieldName(value[key], {
            alias: false
          });
        } else {
          obj[this.formatFieldName(key, { alias })] = value[key];
        }
        return obj;
      }, {});
    }

    return value;
  }

  applyBuilderOptionValues(option, values) {
    // TODO: `returning` is special-cased to allow calling it multiple times
    // with different values (not supported in knex)
    if (option === 'returning') {
      this.builder.returning(values);
    } else {
      this.builder[option].apply(this.builder, values);
    }
  }

  // TODO: test with values like .where('foo', '=', 'bar')
  prepareBuilderOption(option, values, options) {
    if (option === 'distinct' && options.forCount) {
      return;
    }

    if (
      option.includes('Raw') ||
      option === 'transacting' ||
      option === 'forUpdate' ||
      option === 'forShare'
    ) {
      return this.applyBuilderOptionValues(option, values);
    }

    const alias =
      option === 'column' ||
      option === 'columns' ||
      option === 'returning' ||
      option === 'distinct';

    options = Object.assign({}, options, { alias });

    this.applyBuilderOptionValues(
      option,
      values.map(value => this.formatBuilderOptionValue(option, value, options))
    );
  }

  prepareBuilderOptions(options) {
    Object.keys(this.builderOptions).forEach(option => {
      this.builderOptions[option].forEach(values =>
        this.prepareBuilderOption(option, values, options)
      );
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

        if (query.options.on.length) {
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
        this.formatFieldName(distinct[0], { alias: false })
      );
    } else if (this.options.field) {
      this.builder.count(
        this.formatFieldName(this.options.field, { alias: false })
      );
    } else {
      this.builder.count();
    }

    this.builder.limit(1);
  }

  _getInstance(instance) {
    if (!(instance instanceof this.model)) {
      instance = new this.model(instance);
    }
    return instance;
  }

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

        // TODO: make field.cast async again
        const castValue = field.cast(value, instance, { forSave: true });
        if (castValue !== undefined) {
          instance[fieldName] = castValue;
          row[column] = castValue;
        } else {
          row[column] = value;
        }
      })
    );

    // TODO: strict mode: throw if row is empty

    return row;
  }

  // TODO: strict mode: throw if data is not an array nor an object
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

  // TODO: strict mode: throw if data is not an array nor an object
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

  _builderOptionHasOneValue(option) {
    return (
      this.builderOptions[option].length === 1 &&
      this.builderOptions[option][0].length === 1
    );
  }

  async prepareBuilder(options) {
    const { forInsert, forUpdate, forDelete, forFetch, forCount } = options;

    if (forInsert || forUpdate || forDelete) {
      // TODO: add support for DBs that don't have support for RETURNING
      if (this._builderOptionHasOneValue('returning')) {
        this.builderOptions.returning = [['*']];
      }
    } else {
      delete this.builderOptions.returning;
    }

    if (forFetch) {
      if (this.builderOptions.distinct) {
        delete this.builderOptions.columns;
      } else if (this._builderOptionHasOneValue('columns')) {
        // TODO: this can be [['*']], but fieldNames are needed for joins
        this.builderOptions.columns = [[this.fieldNames]];
      }
    } else {
      delete this.builderOptions.columns;
    }

    this.prepareBuilderOptions(options);

    if (this.options.joins.length) {
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

    if (this.options.joins.length) {
      this.options.joins.forEach(query => query.throwFetchRequireError());
    }
  }

  parseRow(row, options) {
    if (!row) {
      return row;
    }

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

  async fetch(options) {
    // TODO: strict mode: throw if a fetch is attempted from a joined query
    this.setOptions(options);
    await this.prepareBuilder({ forFetch: true });

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
      mergeRows: this.options.joins.length
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
    if (Array.isArray(data) || data[this.model.primary] === undefined) {
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
      return this.addBuilderOption(option, args);
    };
  }
});

// from knex
const operators = [
  '=',
  '<',
  '>',
  '<=',
  '>=',
  '<>',
  '!=',
  'like',
  'not like',
  'between',
  'not between',
  'ilike',
  'not ilike',
  'exists',
  'not exist',
  'rlike',
  'not rlike',
  'regexp',
  'not regexp',
  '&',
  '|',
  '^',
  '<<',
  '>>',
  '~',
  '~*',
  '!~',
  '!~*',
  '#',
  '&&',
  '@>',
  '<@',
  '||',
  '&<',
  '&>',
  '-|-',
  '@@',
  '!!',
  '?',
  '?|',
  '?&'
];
