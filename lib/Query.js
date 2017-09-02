const { camelCase, difference } = require('lodash');
const WithKnex = require('./WithKnex');
const QueryError = require('./QueryError');

class CountError extends QueryError {}
class FetchError extends QueryError {}
class InsertError extends QueryError {}
class UpdateError extends QueryError {}
class DeleteError extends QueryError {}
class NoRowsCountedError extends QueryError {}
class NoRowsFetchedError extends QueryError {}
class NoRowsInsertedError extends QueryError {}
class NoRowsUpdatedError extends QueryError {}
class NoRowsDeletedError extends QueryError {}

class Query extends WithKnex {
  constructor(model) {
    if (!model) {
      throw new Error('Query requires a Model class');
    }

    if (!(model.prototype instanceof Model)) {
      throw new Error('Query requires a subclass of Model');
    }

    if (!model.table) {
      throw new Error(`'${model.name}.table' is not configured`);
    }

    super();

    this.model = model;
    this.builder = this.constructor.knex(model.table);
    this.table = model.table;
    this.alias = model.table;
    this.index = 0;

    // TODO: update docs: id field is definitely required because of this
    const idField = this.model.fields[this.model.fieldNames.id];
    this._fields = [{ field: idField }];
    this._returning = [{ field: idField }];

    this._distinct = [];
    this._orderBy = [];
    this._groupBy = [];
    this._joins = [];
    this._on = [];

    this._where = [];
    this._whereNot = [];
    this._orWhere = [];
    this._orWhereNot = [];

    this._having = [];
    this._havingNot = [];
    this._orHaving = [];
    this._orHavingNot = [];

    this._forge = true;
    this._require = false;

    this._parsedRows = [];
    this._parsedData = {};
  }

  _getField(name) {
    const field = this.model.fields[name];
    if (!field) {
      throw new Error(`Unknown field '${this.model.name}.${name}'`);
    }
    return field;
  }

  _getValidatedField(field) {
    if (isString(field)) {
      return this._getField(field);
    }

    if (!(field instanceof Field)) {
      throw new Error(`Invalid field object ${field}`);
    }

    if (field.model.name !== this.model.name) {
      throw new Error(
        `Field '${field.model.name}.${field.name}' is not a field of '${this
          .model.name}'`
      );
    }

    return field;
  }

  _getValidatedFields(fields, options = {}) {
    if (!isArray(fields)) {
      fields = [fields];
    }

    const validatedFields = [];

    fields.forEach(field => {
      if (isString(field) || field instanceof Field) {
        field = this._getValidatedField(field);
        return validatedFields.push({ field });
      }

      if (isObject(field)) {
        Object.keys(field).map(name => {
          const alias = field[name];
          const validatedField = this._getValidatedField(name);

          if (alias instanceof Field) {
            this._getValidatedField(alias); // validate the field
          }

          if (options.alias && isString(alias)) {
            return validatedFields.push({
              alias,
              field: validatedField
            });
          } else {
            return validatedFields.push({
              field: validatedField
            });
          }
        });
      }
    });

    return validatedFields;
  }

  _pushValidatedFields(key, fields, options) {
    this[`_${key}`] = this[`_${key}`].concat(
      this._getValidatedFields(fields, options)
    );
    return this;
  }

  field(field) {
    this._field = this._getValidatedField(field);
    return this;
  }

  distinct(fields) {
    this._pushValidatedFields('distinct', fields, { alias: true });
    this._hasDistint = true;
    return this;
  }

  fields(fields) {
    this._pushValidatedFields('fields', fields, { alias: true });
    this._hasFields = true;
    return this;
  }

  returning(fields) {
    this._pushValidatedFields('returning', fields, { alias: true });
    this._hasReturning = true;
    return this;
  }

  orderBy(orderBy) {
    Object.keys(orderBy).forEach(fieldName => {
      const field = this._getField(fieldName);
      let direction = orderBy[fieldName];

      if (direction === 1) {
        direction = 'asc';
      } else if (direction === -1) {
        direction = 'desc';
      }

      this._orderBy.push({ field, direction });
    });

    return this;
  }

  groupBy(fields) {
    return this._pushValidatedFields('groupBy', fields);
  }

  _join(queries, options) {
    if (!isArray(queries)) {
      queries = [queries];
    }

    queries.forEach(query => {
      if (query.prototype instanceof Model) {
        query = query.query;
      }

      if (
        !this.model.referenced[query.model.name] &&
        !query.model.referenced[this.model.name]
      ) {
        throw new Error(
          `'${this.model.name}' has no references to '${query.model.name}'`
        );
      }

      query._joinType = options._joinType;
      delete options._joinType;

      query.parent = this;
      query.isChild = true;
      query._hasDistint = this._hasDistint;

      if (options) {
        query.setOptions(options);
      }

      this._joins.push(query);
    });

    return this;
  }

  leftJoin(queries, options = {}) {
    options._joinType = 'leftJoin';
    return this._join(queries, options);
  }

  innerJoin(queries, options = {}) {
    options._joinType = 'innerJoin';
    return this._join(queries, options);
  }

  join(...args) {
    return this.innerJoin(...args);
  }

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

    this._transaction = {
      transaction,
      forUpdate,
      forShare
    };

    return this;
  }

  within(...args) {
    return this.transaction(...args);
  }

  _pushWhereOrHaving(key, whereOrHaving) {
    Object.keys(whereOrHaving).forEach(fieldName => {
      const field = this._getField(fieldName);
      const value = whereOrHaving[fieldName];

      this[`_${key}`].push({ field, value });
    });

    return this;
  }

  where(where) {
    return this._pushWhereOrHaving('where', where);
  }
  whereNot(whereNot) {
    return this._pushWhereOrHaving('whereNot', whereNot);
  }
  orWhere(orWhere) {
    return this._pushWhereOrHaving('orWhere', orWhere);
  }
  orWhereNot(orWhereNot) {
    return this._pushWhereOrHaving('orWhereNot', orWhereNot);
  }

  having(having) {
    return this._pushWhereOrHaving('having', having);
  }
  havingNot(havingNot) {
    return this._pushWhereOrHaving('havingNot', havingNot);
  }
  orHaving(orHaving) {
    return this._pushWhereOrHaving('orHaving', orHaving);
  }
  orHavingNot(orHavingNot) {
    return this._pushWhereOrHaving('orHavingNot', orHavingNot);
  }

  setOptions(options = {}) {
    Object.keys(options).forEach(option => {
      if (typeof this[option] !== 'function') {
        throw new Error(`Unknown option '${option}'`);
      }

      const restrictedMethods = [
        'count',
        'fetch',
        'insert',
        'update',
        'save',
        'delete',
        'setOptions'
      ];

      if (option.startsWith('_') || restrictedMethods.includes(option)) {
        throw new Error(`'${option}' is not an allowed option`);
      }

      this[option].call(this, options[option]);
    });

    return this;
  }

  require(require = true) {
    this._require = !!require;
    return this;
  }

  limit(limit) {
    this._limit = parseInt(limit);
    return this;
  }

  batchSize(batchSize) {
    this._batchSize = parseInt(batchSize);
    return this;
  }

  offset(offset) {
    this._offset = parseInt(offset);
    return this;
  }

  first(first = true) {
    this._first = !!first;
    return this;
  }

  forge(forge = true) {
    this._forge = !!forge;
    return this;
  }

  lean(lean = true) {
    this._forge = !lean;
    return this;
  }

  as(as) {
    this._as = as;
    return this;
  }

  on(fields) {
    return this._pushValidatedFields('on', fields);
  }

  _getColumn(field, options = {}) {
    const column = `${this.alias}.${field.column}`;

    if (options.alias) {
      return `${column} as ${this.alias}.${field.name}`;
    } else {
      return column;
    }
  }

  _getColumns(fields, options) {
    return fields.map(({ field }) => {
      return this._getColumn(field, options);
    });
  }

  _addTransaction() {
    this.builder.transacting(this._transaction.transaction);

    if (this._transaction.forUpdate) {
      this.builder.forUpdate();
    }

    if (this._transaction.forShare) {
      this.builder.forShare();
    }
  }

  _addCount() {
    if (this._hasDistint) {
      if (this._distinct.length > 1) {
        throw new Error('Cannot count multiple distinct fields');
      }
      this.builder.countDistinct(this._getColumn(this._distinct[0].field));
    } else if (this._field) {
      this.builder.count(this._getColumn(this._field));
    } else {
      this.builder.count();
    }
  }

  _addDistinct() {
    this.builder.distinct(this._getColumns(this._distinct, { alias: true }));
  }

  _addFields() {
    this.builder.columns(this._getColumns(this._fields, { alias: true }));
  }

  _addReturning() {
    this.builder.returning(this._getColumns(this._returning, { alias: true }));
  }

  _addWhereOrHaving(key) {
    this[`_${key}`].forEach(({ field, value }) => {
      let column = this._getColumn(field);

      if (value === null) {
        this.builder[`${key}Null`](column);
      } else if (Array.isArray(value)) {
        this.builder[`${key}In`](column, value);
      } else if (typeof value === 'object') {
        if (value.column) {
          // TODO: test this
          column = this._getColumn({
            column: value.column
          });
        }
        if (value.raw) {
          // TODO: test this
          this.builder[`${key}Raw`](
            `${column} ${value.operator} ?`,
            value.value
          );
        } else {
          // TODO: test this
          this.builder[`${key}`](column, value.operator, value.value);
        }
      } else if (key.toLowerCase().indexOf('having') > -1) {
        // TODO: QueryBuilder expects `having` to have an operator, the
        // behaviour added in the next line is bound to change at some point
        this.builder[`${key}`](column, '=', value);
      } else {
        this.builder[`${key}`](column, value);
      }
    });
  }

  _addWhere() {
    this._addWhereOrHaving('where');
  }
  _addWhereNot() {
    this._addWhereOrHaving('whereNot');
  }
  _addOrWhere() {
    this._addWhereOrHaving('orWhere');
  }
  _addOrWhereNot() {
    this._addWhereOrHaving('orWhereNot');
  }

  _addHaving() {
    this._addWhereOrHaving('having');
  }
  _addHavingNot() {
    this._addWhereOrHaving('havingNot');
  }
  _addOrHaving() {
    this._addWhereOrHaving('orHaving');
  }
  _addOrHavingNot() {
    this._addWhereOrHaving('orHavingNot');
  }

  _addOrderBy() {
    this._orderBy.forEach(({ field, direction }) => {
      const column = this._getColumn(field);
      this.builder.orderBy(column, direction);
    });
  }

  _addGroupBy() {
    this.builder.groupBy(this._getColumns(this._groupBy));
  }

  _addLimit() {
    this.builder.limit(this._limit);
  }

  _addOffset() {
    this.builder.offset(this._offset);
  }

  _addJoin(options) {
    this._joins.forEach(query => {
      if (!query._as) {
        query._as = camelCase(query.model.name);
      }

      query.index = ++this.index;
      query.alias = `${query.alias}_${query.index}`;
      query.builder = this.builder;

      const forwardReferences = this.model.referenced[query.model.name];
      const reverseReferences = query.model.referenced[this.model.name];
      const isReverseReference = !!reverseReferences;

      const on = [];

      if (query._on.length) {
        if (isReverseReference) {
          query._on.forEach(({ field }) =>
            on.push(...reverseReferences[field.name])
          );
        } else {
          query._on.forEach(({ field }) => on.push(field));
        }
      } else {
        Object.values(forwardReferences || reverseReferences).forEach(fields =>
          on.push(...fields)
        );
      }

      const onColumns = on.reduce((columns, field) => {
        const fromColumn = field.column;
        const toColumn = field.references.column;

        if (isReverseReference) {
          columns[`${query.alias}.${toColumn}`] = `${this.alias}.${fromColumn}`;
        } else {
          columns[`${query.alias}.${fromColumn}`] = `${this.alias}.${toColumn}`;
        }

        return columns;
      }, {});

      const method = query._joinType || 'leftJoin';
      this.builder[method](`${query.table} as ${query.alias}`, onColumns);

      query._prepareBuilder(options);
    });
  }

  _prepareBuilder(options = {}) {
    if (!this.isChild) {
      if (this._transaction) {
        this._addTransaction();
      }
    }

    const getAllFields = () =>
      Object.values(this.model.fields).map(field => ({ field }));

    const { forCount, forInsert, forUpdate, forDelete, forFetch } = options;

    if (forInsert || forUpdate || forDelete) {
      // TODO: add support for DBs that don't have support for RETURNING
      if (!this._hasReturning) {
        this._returning = getAllFields();
      }
      this._addReturning();
    }

    if (forInsert) {
      return this;
    }

    if (this._where.length) {
      this._addWhere();
    }
    if (this._whereNot.length) {
      this._addWhereNot();
    }
    if (this._orWhere.length) {
      this._addOrWhere();
    }
    if (this._orWhereNot.length) {
      this._addOrWhereNot();
    }

    if (forUpdate || forDelete) {
      return this;
    }

    if (forCount) {
      this._addCount();
    }

    if (forFetch) {
      if (this._hasDistint) {
        this._addDistinct();
      } else {
        if (!this._hasFields) {
          this._fields = getAllFields();
        }
        this._addFields();
      }
    }

    if (this._joins.length) {
      this._addJoin(options);
    }

    if (this._groupBy.length) {
      this._addGroupBy();
    }

    if (this._having.length) {
      this._addHaving();
    }
    if (this._havingNot.length) {
      this._addHavingNot();
    }
    if (this._orHaving.length) {
      this._addOrHaving();
    }
    if (this._orHavingNot.length) {
      this._addOrHavingNot();
    }

    if (this._orderBy.length) {
      this._addOrderBy();
    }

    if (this.isChild) {
      return this;
    }

    // TODO: Add support for limit and offset options in joined queries
    // will probably require joining with a subquery
    if (this._first) {
      this._limit = 1;
    }
    if (this._limit !== undefined) {
      this._addLimit();
    }
    if (this._offset !== undefined) {
      this._addOffset();
    }

    return this;
  }

  async count(options = {}) {
    this.setOptions(options);
    this._prepareBuilder({ forCount: true });

    let row;
    try {
      row = await this.builder.first();
    } catch (error) {
      throw new CountError({ error, query: this });
    }

    const count = parseInt(row.count);

    if (!count && this._require) {
      throw new NoRowsCountedError({ query: this });
    }

    return count;
  }

  _hasData(data) {
    return (
      data &&
      data[this.alias] &&
      Object.values(data[this.alias]).some(value => value !== null)
    );
  }

  _populateData(instance, row, options) {
    Object.keys(row).forEach(aliasedField => {
      const tableNameFieldNamePair = aliasedField.split('.');
      const field = tableNameFieldNamePair[1]
        ? tableNameFieldNamePair[1]
        : tableNameFieldNamePair[0];
      const value = row[aliasedField];

      instance[field] = value;
    });

    instance.cast({ forFetch: true });

    // populate aliases
    const fields = options.forFetch ? this._fields : this._returning;
    fields.forEach(({ field, alias }) => {
      if (alias) {
        instance[alias] = instance[field.name];
        // we use delete here so we can return the same instance that
        // was passed. alternatively, we could clone the instance but
        // then we would have to make sure we copy over all properties
        // that may have been added by the user
        delete instance[field.name];
      }
    });

    return instance;
  }

  _parseData(data, options) {
    const instanceData = data[this.alias];
    const id = instanceData[this.model.fieldNames.id];

    let parsedData = this._parsedData[id];
    if (!parsedData || !id) {
      parsedData = this._populateData(
        new this.model(), // eslint-disable-line new-cap
        instanceData,
        options
      );

      if (!this._forge) {
        parsedData = parsedData._getFieldData();
      }

      if (id) {
        this._parsedData[id] = parsedData;
      }
      this._parsedRows.push(parsedData);
    }

    if (this._joins.length) {
      this._joins.forEach(async query => {
        if (query._hasData(data)) {
          const nestedData = query._parseData(data, options);

          if (parsedData[query._as]) {
            parsedData[query._as] = [parsedData[query._as], nestedData];
          } else {
            parsedData[query._as] = nestedData;
          }
        }
      });
    }

    return parsedData;
  }

  _parseRows(rows, options) {
    rows.map(row => {
      const data = Object.keys(row).reduce((data, column) => {
        const value = row[column];
        const pair = column.split('.');
        const alias = pair[0];
        const field = pair[1];

        data[alias] = data[alias] || {};
        data[alias][field] = value;

        return data;
      }, {});

      this._parseData(data, options);
    });

    return this._parsedRows.slice();
  }

  _maybeThrowFetchRequireErrors() {
    if (this._require) {
      throw new NoRowsFetchedError({ query: this });
    }

    if (this._joins.length) {
      this._joins.forEach(query => query._maybeThrowFetchRequireErrors());
    }
  }

  async fetch(options) {
    if (this.isChild) {
      throw new Error(
        `Cannot fetch from a child query. (${this.model.name}.query is ${this
          .parent.model.name}.query's child)`
      );
    }

    if (options) {
      this.setOptions(options);
    }

    this._prepareBuilder({ forFetch: true });

    let rows;
    try {
      rows = await this.builder.select();
    } catch (error) {
      throw new FetchError({ error, query: this });
    }

    if (!rows.length) {
      this._maybeThrowFetchRequireErrors();
      return this._first ? null : [];
    }

    const parsedRows = this._parseRows(rows, { forFetch: true });
    return this._first ? parsedRows[0] : parsedRows;
  }

  async delete(options) {
    // TODO: add support for deleting joined models
    if (options) {
      this.setOptions(options);
    }

    this._prepareBuilder({ forDelete: true });

    let rows;
    try {
      rows = await this.builder.delete();
    } catch (error) {
      throw new DeleteError({ error, query: this });
    }

    if (!rows.length) {
      if (this._require) {
        throw new NoRowsDeletedError({ query: this });
      }
      return null;
    }

    return this._parseRows(rows, { forDelete: true });
  }

  _getValidatedInstance(instance, operation) {
    if (!(instance instanceof this.model)) {
      if (!isObject(instance)) {
        throw new Error(`Cannot ${operation} non-object '${instance}'`);
      } else if (instance instanceof Model) {
        throw new Error(
          `Cannot ${operation} an instance of ${instance.constructor
            .name} with ${this.model.name}.query`
        );
      }
      // eslint-disable-next-line new-cap
      instance = new this.model(instance);
    }
    return instance;
  }

  async _getRow(instance, fields) {
    const data = await instance.getData({ fields });

    return Object.keys(data).reduce((row, field) => {
      field = this.model.fields[field];
      row[field.column] = data[field.name];
      return row;
    }, {});
  }

  // TODO: add support for inserting joined models
  async insert(data, options) {
    const rows = [];
    const instances = [];
    const isDataArray = Array.isArray(data);
    const prepareData = async data => {
      const instance = this._getValidatedInstance(data, 'insert');

      instance.setDefaults();

      const fieldsNotToSave = [];
      const idField = this.model.fieldNames.id;
      if (instance[idField] === undefined) {
        fieldsNotToSave.push(idField);
      }

      const allFields = Object.keys(this.model.fields);
      const fieldsToSave = difference(allFields, fieldsNotToSave);

      await instance.validate({ fields: fieldsToSave });
      instance.cast({ fields: fieldsToSave, forSave: true });
      const row = await this._getRow(instance, fieldsToSave);

      // TODO: strict mode: throw if row is empty

      instances.push(instance);
      rows.push(row);
    };

    if (isDataArray) {
      await Promise.all(data.map(prepareData));
    } else {
      await prepareData(data);
    }

    if (options) {
      this.setOptions(options);
    }

    this._prepareBuilder({ forInsert: true });

    let insertedRows = [];
    try {
      if (this._batchSize) {
        let current = 0;
        let batches = [];
        while (current < rows.length) {
          batches.push(rows.slice(current, current + this._batchSize));
          current += this._batchSize;
        }
        batches = await Promise.all(
          batches.map(async batch => {
            return this.builder.clone().insert(batch);
          })
        );
        batches.forEach(batch => {
          insertedRows = insertedRows.concat(batch);
        });
      } else {
        insertedRows = await this.builder.insert(rows);
      }
    } catch (error) {
      throw new InsertError({ error, query: this });
    }

    if (!insertedRows.length) {
      if (this._require) {
        throw new NoRowsInsertedError({ query: this });
      }
      return isDataArray ? insertedRows : null;
    }

    const populatedInstances = instances.map((instance, index) =>
      this._populateData(instance, insertedRows[index], { forInsert: true })
    );

    return isDataArray ? populatedInstances : populatedInstances[0];
  }

  async update(data, options) {
    // TODO: add support for updating joined models
    const instance = this._getValidatedInstance(data, 'update');

    const idField = this.model.fieldNames.id;
    const id = instance[idField];
    if (id !== undefined) {
      this.where({ [idField]: id });
    }

    if (options) {
      this.setOptions(options);
    }

    this._prepareBuilder({ forUpdate: true });

    const allFields = Object.keys(this.model.fields);
    const filledFields = allFields.filter(name => {
      return instance[name] !== undefined;
    });
    const fieldsNotToSave = [this.model.fieldNames.id];
    const fieldsToSave = difference(filledFields, fieldsNotToSave);

    instance.cast({ fields: fieldsToSave, forSave: true });
    await instance.validate({ fields: fieldsToSave });
    const row = await this._getRow(instance, fieldsToSave);

    // TODO: strict mode: throw if row is empty

    let rows;
    try {
      rows = await this.builder.update(row);
    } catch (error) {
      throw new UpdateError({ error, query: this });
    }

    if (!rows.length) {
      if (this._require) {
        throw new NoRowsUpdatedError({ query: this });
      }
      return null;
    }

    // TODO: document this: since we return the same instance as passed, we
    // don't respect the `returning` option fully. i.e. if it requests that
    // fields that are already set on the instance are not returned.

    return rows.length === 1
      ? this._populateData(instance, rows[0], { forUpdate: true })
      : this._parseRows(rows, { forUpdate: true });
  }

  async save(data, options) {
    if (Array.isArray(data) || data[this.model.fieldNames.id] === undefined) {
      return this.insert(data, options);
    }

    return this.update(data, options);
  }

  // TODO: add support for re-using Query instances i.e. Query.prototype._reset
}

const isObject = value => typeof value === 'object' && value !== null;
const isString = value => typeof value === 'string';
const isArray = Array.isArray;

Query.errors = {
  QueryError,
  CountError,
  FetchError,
  InsertError,
  UpdateError,
  DeleteError,
  NoRowsCountedError,
  NoRowsFetchedError,
  NoRowsInsertedError,
  NoRowsUpdatedError,
  NoRowsDeletedError
};

module.exports = Query;

const Model = require('./Model'); // circular dep
const Field = require('./Field');
