/**
 * Generates SQL.
 */
class Sql {
  /**
   * Creates a new {@link Sql} instance.

   * @param {Model} Model The model class to bind the new instance to.
   */
  constructor(Model) {
    this.Model = Model;
    this._values = [];
    this._fields = [];
  }

  /**
   * Adds a value to the {@link Sql} instance's values.
   *
   * @param {any} value The value to add.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  addValue(value) {
    this._values.push(value);

    return this;
  }

  /**
   * Adds multiple values to the {@link Sql} instance's values.
   *
   * @param {array} values The values to add.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  addValues(values) {
    this._values = this._values.concat(values);

    return this;
  }

  /**
   * Returns the {@link Sql} instance's values.
   *
   * @returns {array}
   */
  getValues() {
    return this._values;
  }

  /**
   * Adds a field to the {@link Sql} instance's fields.
   *
   * @param {any} field The field to add.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  addField(field) {
    this._fields.push(field);

    return this;
  }

  /**
   * Adds multiple fields to the {@link Sql} instance's fields.
   *
   * @param {array} fields The fields to add.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  addFields(fields) {
    this._fields = this._fields.concat(fields);

    return this;
  }

  /**
   * Returns the {@link Sql} instance's fields.
   *
   * @returns {array}
   */
  getFields() {
    return this._fields;
  }

  /**
   * Sets the {@link Sql} instance's alias.
   *
   * @param {string} alias The alias.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  setAlias(alias) {
    this._alias = alias;

    return this;
  }

  /**
   * Returns the {@link Sql} instance's alias if it has been set.
   *
   * @returns {undefined|string} The alias or `undefined` if it's not set.
   */
  getAlias() {
    return this._alias;
  }

  // TODO: add part for identifier? so it can be used in raw Parts?
  formatIdentifier(identifier) {
    return `"${identifier}"`;
  }

  // TODO: remove?
  formatDot(left, right) {
    return `${left}.${right}`;
  }

  // TODO: remove?
  formatAs(value, alias) {
    return `${value} AS ${alias}`;
  }

  formatAlias() {
    const { _alias } = this;

    if (!_alias) {
      return;
    }

    return this.formatIdentifier(_alias);
  }

  formatTable() {
    let table = this.Model.table;

    if (!table) {
      throw new this.constructor.SqlError({
        sql: this,
        message: `\`${this.Model.name}.table\` is not configured`
      });
    }

    table = this.formatIdentifier(table);

    const schema = this.Model.schema;

    if (schema) {
      table = this.formatDot(this.formatIdentifier(schema), table);
    }

    const alias = this.formatAlias();

    if (alias) {
      table = this.formatAs(table, alias);
    }

    return table;
  }

  formatColumn(field) {
    const column = this.Model.config.columns[field];

    if (!column) {
      throw new this.constructor.SqlError({
        sql: this,
        message: `unknown field \`${field}\``
      });
    }

    return this.formatIdentifier(column);
  }

  formatQuery(query) {
    const { sql, values, fields } = query.formatSelect();

    this.addValues(values);
    this.addFields(fields);

    // TODO: always with parens?
    return `(${sql})`;
  }

  formatRaw({ value }) {
    if (typeof value === 'string') {
      value = { sql: value };
    }

    const { sql, values, fields } = value;

    if (values) {
      this.addValues(values);
    }

    if (fields) {
      this.addFields(fields);
    }

    return sql;
  }

  formatValue(value, { formatArray, formatObject, formatValue } = {}) {
    if (value === undefined) {
      throw new this.constructor.SqlError({
        sql: this,
        message: 'value is `undefined`'
      });
    }

    // TODO: Query overloads (e.g. Knorm.prototype.Query) should extend Query

    if (value instanceof Query) {
      return this.formatQuery(value);
    }

    if (value instanceof this.constructor.SqlPart) {
      return this.formatSqlPart(value);
    }

    const isArray = Array.isArray(value);

    if (isArray && formatArray) {
      return formatArray(value);
    }

    const isObject = typeof value === 'object' && !isArray;

    if (isObject && formatObject) {
      return formatObject(value);
    }

    if (formatValue) {
      return formatValue(value);
    }

    this.addValue(value);

    return '?';
  }

  formatField(field) {
    return this.formatValue(field, {
      formatValue: field => {
        const table = this.formatAlias() || this.formatTable();

        return this.formatDot(table, this.formatColumn(field));
      }
    });
  }

  formatSelect({ value: parts }) {
    const select = parts.map(part => this.formatValue(part)).join(' ');

    return `SELECT ${select}`;
  }

  formatDistinct({ value }) {
    if (value) {
      value = this.formatValue(value);
    }

    return value ? `DISTINCT ${value}` : 'DISTINCT';
  }

  formatAll({ value }) {
    if (value) {
      value = this.formatValue(value);
    }

    return value ? `ALL ${value}` : 'ALL';
  }

  formatFields({ value: fields }) {
    return this.formatValue(fields, {
      formatArray: fields => {
        return fields
          .map(field => {
            return this.formatValue(field, {
              formatObject: fields => {
                return Object.entries(fields)
                  .map(([alias, field]) => {
                    this.addField(alias);

                    return this.formatField(field);
                  })
                  .join(', ');
              },
              formatValue: field => {
                this.addField(field);

                return this.formatField(field);
              }
            });
          })
          .join(', ');
      }
    });
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatFrom() {
    const from = this.formatTable();

    return `FROM ${from}`;
  }

  formatNot({ value }) {
    return `NOT ${this.formatValue(value)}`;
  }

  formatAny({ value }) {
    return `ANY ${this.formatValue(value)}`;
  }

  formatSome({ value }) {
    return `SOME ${this.formatValue(value)}`;
  }

  formatExists({ value }) {
    return `EXISTS ${this.formatValue(value)}`;
  }

  formatEqualTo({ field, value }) {
    return `${this.formatField(field)} = ${this.formatValue(value)}`;
  }

  formatNotEqualTo({ field, value }) {
    return `${this.formatField(field)} <> ${this.formatValue(value)}`;
  }

  formatGreaterThan({ field, value }) {
    return `${this.formatField(field)} > ${this.formatValue(value)}`;
  }

  formatGreaterThanOrEqualTo({ field, value }) {
    return `${this.formatField(field)} >= ${this.formatValue(value)}`;
  }

  formatLessThan({ field, value }) {
    return `${this.formatField(field)} < ${this.formatValue(value)}`;
  }

  formatLessThanOrEqualTo({ field, value }) {
    return `${this.formatField(field)} <= ${this.formatValue(value)}`;
  }

  formatIsNull({ field }) {
    return `${this.formatField(field)} IS NULL`;
  }

  formatIsNotNull({ field }) {
    return `${this.formatField(field)} IS NOT NULL`;
  }

  formatLike({ field, value }) {
    return `${this.formatField(field)} LIKE ${this.formatValue(value)}`;
  }

  formatBetween({ field, value }) {
    // TODO: strict mode: throw if value does not have exactly 2 items
    const between = value.map(value => this.formatValue(value)).join(' AND ');

    return `${this.formatField(field)} BETWEEN ${between}`;
  }

  formatIn({ field, value }) {
    // TODO: strict mode: warn when value is an empty array
    if (!value.length) {
      value = [null];
    }

    const _in = value.map(value => this.formatValue(value)).join(', ');

    return `${this.formatField(field)} IN (${_in})`;
  }

  formatAndOrOr({ type, value: values }) {
    if (!Array.isArray(values)) {
      values = [values];
    }

    const grouping = values.map(value => {
      return this.formatValue(value, {
        formatObject: object => {
          const and = this.constructor.and(
            Object.entries(object).map(([field, value]) => {
              return this.constructor.equalTo(field, value);
            })
          );

          return this.formatAnd(and);
        }
      });
    });

    if (grouping.length === 1) {
      return grouping[0];
    }

    const glue = type === 'and' ? ' AND ' : type === 'or' ? ' OR ' : '';

    return `(${grouping.join(glue)})`;
  }

  formatAnd(sqlPart) {
    return this.formatAndOrOr(sqlPart);
  }

  formatOr(sqlPart) {
    return this.formatAndOrOr(sqlPart);
  }

  // TODO: JSON fields in WHERE?
  formatWhere({ value }) {
    const and = this.constructor.and(value);

    return `WHERE ${this.formatAnd(and)}`;
  }

  formatGroupBy({ value: fields }) {
    const groupBy = fields
      .map(field => {
        return this.formatValue(field, {
          formatValue: field => {
            return this.formatField(field);
          }
        });
      })
      .join(', ');

    return `GROUP BY ${groupBy}`;
  }

  formatHaving({ value }) {
    const and = this.constructor.and(value);

    return `HAVING ${this.formatAnd(and)}`;
  }

  formatAsc({ value }) {
    if (value) {
      value = this.formatValue(value);
    }

    return value ? `ASC ${value}` : 'ASC';
  }

  formatDesc({ value }) {
    if (value) {
      value = this.formatValue(value);
    }

    return value ? `DESC ${value}` : 'DESC';
  }

  formatNulls({ value }) {
    return `NULLS ${this.formatValue(value)}`;
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatFirst() {
    return 'FIRST';
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatLast() {
    return 'LAST';
  }

  formatOrderBy({ value: fields }) {
    const orderBy = fields
      .map(field => {
        return this.formatValue(field, {
          formatObject: object => {
            return Object.entries(object)
              .map(([field, direction]) => {
                direction = this.formatValue(direction, {
                  formatValue: direction => {
                    const lower =
                      typeof direction === 'string' && direction.toLowerCase();

                    if (direction === 1 || lower === 'asc') {
                      return this.formatAsc(this.constructor.asc());
                    }

                    if (direction === -1 || lower === 'desc') {
                      return this.formatDesc(this.constructor.desc());
                    }
                  }
                });

                return `${this.formatField(field)} ${direction}`;
              })
              .join(', ');
          },
          formatValue: value => {
            if (Number.isInteger(value)) {
              return this.formatValue(value);
            }

            return this.formatField(value);
          }
        });
      })
      .join(', ');

    return `ORDER BY ${orderBy}`;
  }

  formatLimitOrOffset({ type, value }) {
    const clause =
      type === 'limit' ? 'LIMIT' : type === 'offset' ? 'OFFSET' : '';

    value = this.formatValue(value, {
      formatValue: value => {
        value = parseInt(value);

        if (Number.isInteger(value)) {
          return value;
        }

        throw new this.constructor.SqlError({
          sql: this,
          message: `value for ${clause} should be an integer`
        });
      }
    });

    return `${clause} ${value}`;
  }

  formatLimit(sqlPart) {
    return this.formatLimitOrOffset(sqlPart);
  }

  formatOffset(sqlPart) {
    return this.formatLimitOrOffset(sqlPart);
  }

  // TODO: checkpoint: add FOR

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatInto() {
    const into = this.formatTable();

    return `INTO ${into}`;
  }

  formatColumns({ value }) {
    const columns = value.map(field => this.formatColumn(field)).join(', ');

    return `(${columns})`;
  }

  formatValues({ value }) {
    // TODO: first figure out how Query will set this up

    // TODO: test values as Query
    // TODO: test values as Part
    // TODO: test values as array
    const values = this.formatValue(value, {
      formatArray: array => {
        return array
          .map(row => {
            // TODO: test row as Query
            // TODO: test row as Part
            // TODO: test row as array
            // TODO: test row as empty array
            row = this.formatValue(row, {
              formatArray: row => {
                if (!row.length) {
                  throw new this.constructor.SqlError({
                    sql: this,
                    message: 'empty `VALUES` row'
                  });
                }
                // TODO: test value as Query
                // TODO: test value as Part
                // TODO: test value as array
                // TODO: test value as object
                // TODO: test value as primitive
                return row.map(value => this.formatValue(value)).join(', ');
              }
            });

            return `(${row})`;
          })
          .join(', ');
      }
    });

    return `VALUES ${values}`;
  }

  formatReturning({ value }) {
    const returning = value.map(field => this.formatField(field)).join(', ');

    return `RETURNING ${returning}`;
  }

  formatInsert({ value }) {
    const insert = ['INSERT']
      .concat(value.map(part => this.formatSqlPart(part)))
      .join(' ');

    return { sql: insert, values: this._values, fields: this._fields };
  }

  formatSqlPart(sqlPart) {
    const { type } = sqlPart;

    if (type === 'raw') {
      return this.formatRaw(sqlPart);
    }

    if (type === 'select') {
      return this.formatSelect(sqlPart);
    }

    if (type === 'distinct') {
      return this.formatDistinct(sqlPart);
    }

    if (type === 'all') {
      return this.formatAll(sqlPart);
    }

    if (type === 'from') {
      return this.formatFrom(sqlPart);
    }

    if (type === 'fields') {
      return this.formatFields(sqlPart);
    }

    if (type === 'not') {
      return this.formatNot(sqlPart);
    }

    if (type === 'any') {
      return this.formatAny(sqlPart);
    }

    if (type === 'some') {
      return this.formatSome(sqlPart);
    }

    if (type === 'exists') {
      return this.formatExists(sqlPart);
    }

    if (type === 'equalTo') {
      return this.formatEqualTo(sqlPart);
    }

    if (type === 'notEqualTo') {
      return this.formatNotEqualTo(sqlPart);
    }

    if (type === 'greaterThan') {
      return this.formatGreaterThan(sqlPart);
    }

    if (type === 'greaterThanOrEqualTo') {
      return this.formatGreaterThanOrEqualTo(sqlPart);
    }

    if (type === 'lessThan') {
      return this.formatLessThan(sqlPart);
    }

    if (type === 'lessThanOrEqualTo') {
      return this.formatLessThanOrEqualTo(sqlPart);
    }

    if (type === 'isNull') {
      return this.formatIsNull(sqlPart);
    }

    if (type === 'isNotNull') {
      return this.formatIsNotNull(sqlPart);
    }

    if (type === 'like') {
      return this.formatLike(sqlPart);
    }

    if (type === 'between') {
      return this.formatBetween(sqlPart);
    }

    if (type === 'in') {
      return this.formatIn(sqlPart);
    }

    if (type === 'and') {
      return this.formatAnd(sqlPart);
    }

    if (type === 'or') {
      return this.formatOr(sqlPart);
    }

    if (type === 'where') {
      return this.formatWhere(sqlPart);
    }

    if (type === 'groupBy') {
      return this.formatGroupBy(sqlPart);
    }

    if (type === 'having') {
      return this.formatHaving(sqlPart);
    }

    if (type === 'asc') {
      return this.formatAsc(sqlPart);
    }

    if (type === 'desc') {
      return this.formatDesc(sqlPart);
    }

    if (type === 'nulls') {
      return this.formatNulls(sqlPart);
    }

    if (type === 'first') {
      return this.formatFirst(sqlPart);
    }

    if (type === 'last') {
      return this.formatLast(sqlPart);
    }

    if (type === 'orderBy') {
      return this.formatOrderBy(sqlPart);
    }

    if (type === 'limit') {
      return this.formatLimit(sqlPart);
    }

    if (type === 'offset') {
      return this.formatOffset(sqlPart);
    }

    if (type === 'insert') {
      return this.formatInsert(sqlPart);
    }

    if (type === 'into') {
      return this.formatInto(sqlPart);
    }

    if (type === 'columns') {
      return this.formatColumns(sqlPart);
    }

    if (type === 'values') {
      return this.formatValues(sqlPart);
    }

    if (type === 'returning') {
      return this.formatReturning(sqlPart);
    }

    throw new this.constructor.SqlError({
      sql: this,
      message: `unsupported part-type \`${type}\``
    });
  }

  /**
   * Creates a new {@link SqlPart} instance of type `raw`.
   *
   * ::: warning NOTE
   * The raw SQL string should not contain values - placeholders should be used
   * instead.
   *
   * Including values directly in the SQL string might lead to SQL injection or
   * incorrect SQL generation by some database plugins e.g. @knorm/postgres.
   * :::
   *
   * @param {string|object} value The raw SQL. This could be a string of raw SQL
   * or an object containing `sql`, `values` or `fields` properties.
   * @param {string} value.sql The raw SQL string. [Prepared
   * statements](https://en.wikipedia.org/wiki/Prepared_statement) are supported
   * and encouraged. Use question marks (?) as placeholders.
   * @param {array} [value.values] The values to be bound to the prepared SQL
   * statement, if there are any placeholders in the raw SQL.
   * @param {array} [value.fields] A list of fields in the raw SQL that will be
   * returned from the database once the query is run.
   *
   * @example Raw SQL with placeholders and values:
   * ```js
   * Model.sql.raw({ sql: 'UPPER(?)', values: ['foo'] });
   * ```
   *
   * @example Raw SQL with placeholders, values and return fields:
   * ```js
   * Model.sql.raw({
   *  sql: 'UPPER(?) AS "upper"',
   *  values: ['foo'],
   *  fields: ['upper']
   * });
   * ```
   *
   * @returns {SqlPart}
   */
  static raw(value) {
    return new this.SqlPart({ type: 'raw', value });
  }

  static select(value) {
    return new this.SqlPart({ type: 'select', value });
  }

  static distinct(value) {
    return new this.SqlPart({ type: 'distinct', value });
  }

  static all(value) {
    return new this.SqlPart({ type: 'all', value });
  }

  static fields(value) {
    return new this.SqlPart({ type: 'fields', value });
  }

  static from() {
    return new this.SqlPart({ type: 'from' });
  }

  static where(value) {
    return new this.SqlPart({ type: 'where', value });
  }

  static not(value) {
    return new this.SqlPart({ type: 'not', value });
  }

  static any(value) {
    return new this.SqlPart({ type: 'any', value });
  }

  static some(value) {
    return new this.SqlPart({ type: 'some', value });
  }

  static exists(value) {
    return new this.SqlPart({ type: 'exists', value });
  }

  static equalTo(field, value) {
    return new this.SqlPart({ type: 'equalTo', field, value });
  }

  static notEqualTo(field, value) {
    return new this.SqlPart({ type: 'notEqualTo', field, value });
  }

  static greaterThan(field, value) {
    return new this.SqlPart({ type: 'greaterThan', field, value });
  }

  static greaterThanOrEqualTo(field, value) {
    return new this.SqlPart({
      type: 'greaterThanOrEqualTo',
      field,
      value
    });
  }

  static lessThan(field, value) {
    return new this.SqlPart({ type: 'lessThan', field, value });
  }

  static lessThanOrEqualTo(field, value) {
    return new this.SqlPart({
      type: 'lessThanOrEqualTo',
      field,
      value
    });
  }

  static isNull(field) {
    return new this.SqlPart({ type: 'isNull', field });
  }

  static isNotNull(field) {
    return new this.SqlPart({ type: 'isNotNull', field });
  }

  static like(field, value) {
    return new this.SqlPart({ type: 'like', field, value });
  }

  static between(field, value) {
    return new this.SqlPart({ type: 'between', field, value });
  }

  static in(field, value) {
    return new this.SqlPart({ type: 'in', field, value });
  }

  static and(value) {
    return new this.SqlPart({ type: 'and', value });
  }

  static or(value) {
    return new this.SqlPart({ type: 'or', value });
  }

  static groupBy(value) {
    return new this.SqlPart({ type: 'groupBy', value });
  }

  static having(value) {
    return new this.SqlPart({ type: 'having', value });
  }

  static orderBy(value) {
    return new this.SqlPart({ type: 'orderBy', value });
  }

  static asc(value) {
    return new this.SqlPart({ type: 'asc', value });
  }

  static desc(value) {
    return new this.SqlPart({ type: 'desc', value });
  }

  static nulls(value) {
    return new this.SqlPart({ type: 'nulls', value });
  }

  static first(value) {
    return new this.SqlPart({ type: 'first', value });
  }

  static last() {
    return new this.SqlPart({ type: 'last' });
  }

  static limit(value) {
    return new this.SqlPart({ type: 'limit', value });
  }

  static offset(value) {
    return new this.SqlPart({ type: 'offset', value });
  }

  static insert(value) {
    return new this.SqlPart({ type: 'insert', value });
  }

  static into() {
    return new this.SqlPart({ type: 'into' });
  }

  static columns(value) {
    return new this.SqlPart({ type: 'columns', value });
  }

  static values(value) {
    return new this.SqlPart({ type: 'values', value });
  }

  static returning(value) {
    return new this.SqlPart({ type: 'returning', value });
  }
}

Sql.SqlPart = require('./Sql/SqlPart');
Sql.SqlError = require('./Sql/SqlError');

module.exports = Sql;

const Query = require('./Query');
