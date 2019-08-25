const { inspect } = require('util');

/**
 * Generates SQL.
 */
class Sql {
  /**
   * Creates a new {@link Sql} instance.
   */
  constructor() {
    /**
     * The {@link Sql} instance's bind-values.
     *
     * @type {array}
     */
    this.values = [];

    /**
     * The {@link Sql} instance's return-fields.
     *
     * @type {string[]}
     */
    this.fields = [];
  }

  // TODO: optimise all Array#map, Array#forEach etc

  /**
   * Adds a bind-value to the {@link Sql} instance's bind-values.
   *
   * @param {*} value The value to add.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  addValue(value) {
    this.values.push(value);

    return this;
  }

  /**
   * Adds multiple bind-values to the {@link Sql} instance's bind-values.
   *
   * @param {array} values The values to add.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  addValues(values) {
    this.values = this.values.concat(values);

    return this;
  }

  /**
   * Returns the {@link Sql} instance's bind-values.
   *
   * @returns {array} The {@link Sql} instance's bind-values
   */
  getValues() {
    return this.values;
  }

  /**
   * Adds a return-field to the {@link Sql} instance's return-fields.
   *
   * @param {string} field The field to add.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  addField(field) {
    this.fields.push(field);

    return this;
  }

  /**
   * Adds multiple return-fields to the {@link Sql} instance's return-fields.
   *
   * @param {string[]} fields The fields to add.
   *
   * @returns {Sql} The same {@link Sql} instance to allow chaining.
   */
  addFields(fields) {
    this.fields = this.fields.concat(fields);

    return this;
  }

  /**
   * Returns the {@link Sql} instance's return-fields.
   *
   * @returns {array} The {@link Sql} instance's return-fields
   */
  getFields() {
    return this.fields;
  }

  throwSqlError(message, options) {
    throw new this.constructor.SqlError({ message, options, sql: this });
  }

  /**
   * Returns the character to use as a placeholder in SQL texts.
   *
   * @param {object} options Query options.
   *
   * @returns {string} The placeholder (`?` by default).
   */
  formatPlaceholder(options) {
    return '?';
  }

  // TODO: add an SqlPart for identifiers, that can be used in raw SqlParts?
  // (relevant for postgres, where identifiers have to be numbered)
  formatIdentifier(identifier, options) {
    // TODO: use the database's quote_identifier methods?
    // TODO: use pg-format's `ident` method in @knorm/postgres
    return `"${identifier}"`;
  }

  // TODO: remove?
  formatDot(left, right, options) {
    return `${left}.${right}`;
  }

  // TODO: formatSubSelect?
  formatQuery(query, options) {
    const { text, values, fields } = query.formatSelect();

    this.addValues(values);
    this.addFields(fields);

    // TODO: always with parens?
    return `(${text})`;
  }

  formatModel(Model, options) {
    const { table, schema } = Model;

    if (!table) {
      return this.throwSqlError(`${Model.name}: table not configured`, options);
    }

    return schema
      ? this.formatDot(
          this.formatIdentifier(schema, options),
          this.formatIdentifier(table, options),
          options
        )
      : this.formatIdentifier(table, options);
  }

  formatValue(
    value,
    options,
    {
      formatModel,
      formatQuery,
      formatSqlPart,
      formatArray,
      formatObject,
      formatValue
    } = {}
  ) {
    if (value === undefined) {
      return this.throwSqlError(`value is ${inspect(undefined)}`, options);
    }

    // TODO: document that Model and Query overloads (e.g.
    // Knorm.prototype.Query) should extend Model, Query etc because of
    // instanceof checks

    if (value && value.prototype instanceof Model) {
      if (formatModel) {
        return formatModel(value, options);
      }

      return this.formatModel(value, options);
    }

    if (value instanceof Query) {
      if (formatQuery) {
        return formatQuery(value, options);
      }

      return this.formatQuery(value, options);
    }

    if (value instanceof this.constructor.SqlPart) {
      if (formatSqlPart) {
        return formatSqlPart(value, options);
      }

      return this.formatSqlPart(value, options);
    }

    const isArray = Array.isArray(value);

    if (isArray && formatArray) {
      return formatArray(value, options);
    }

    const isObject = typeof value === 'object' && !isArray;

    if (isObject && formatObject) {
      return formatObject(value, options);
    }

    if (formatValue) {
      return formatValue(value, options);
    }

    return this.addValue(value).formatPlaceholder(options);
  }

  formatColumn(field, options) {
    const { Model } = options;
    const column = Model.columns[field];

    if (!column) {
      return this.throwSqlError(
        `${Model.name}: column not configured for field ${inspect(field)}`,
        options
      );
    }

    return this.formatIdentifier(column, options);
  }

  formatField(field, options) {
    return this.formatValue(field, options, {
      formatValue: field => {
        const { Model, alias } = options;
        const prefix = alias
          ? this.formatIdentifier(alias, options)
          : this.formatModel(Model, options);
        const column = this.formatColumn(field, options);

        return this.formatDot(prefix, column, options);
      }
    });
  }

  // TODO: support pg-format strings in raw SQL (in @knorm/postgres)
  formatRaw({ value }, options) {
    if (typeof value === 'string') {
      value = { text: value };
    }

    const { text, values, fields } = value;

    if (values) {
      this.addValues(values);
    }

    if (fields) {
      this.addFields(fields);
    }

    return text;
  }

  formatSelect({ value: parts }, options) {
    const select = parts.map(part => this.formatValue(part, options)).join(' ');

    return `SELECT ${select}`;
  }

  formatDistinct({ value }, options) {
    return value ? `DISTINCT ${this.formatValue(value, options)}` : 'DISTINCT';
  }

  formatAll({ value }, options) {
    return value ? `ALL ${this.formatValue(value, options)}` : 'ALL';
  }

  formatFields({ value: fields }, options) {
    return this.formatValue(fields, options, {
      formatArray: fields => {
        return fields
          .map(field => {
            return this.formatValue(field, options, {
              formatObject: fields => {
                return Object.entries(fields)
                  .map(([alias, field]) => {
                    return this.addField(alias).formatField(field, options);
                  })
                  .join(', ');
              },
              formatValue: field => {
                return this.addField(field).formatField(field, options);
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
  formatFrom({ value }, options) {
    const from = value.map(from => this.formatValue(from, options)).join(', ');

    return `FROM ${from}`;
  }

  formatWhereOrHaving({ type, value: values }, options) {
    values = values
      .map(value => {
        return this.formatValue(value, options, {
          formatObject: object => {
            const and = this.constructor.and(
              Object.entries(object).map(([field, value]) => {
                return this.constructor.equalTo(field, value);
              })
            );

            return this.formatAnd(and, options);
          }
        });
      })
      .join(' AND ');

    const clause =
      type === 'where' ? 'WHERE' : type === 'having' ? 'HAVING' : '';

    return `${clause} ${values}`;
  }

  // TODO: JSON fields in WHERE?
  formatWhere(sqlPart, options) {
    return this.formatWhereOrHaving(sqlPart, options);
  }

  formatNot({ value }, options) {
    return `NOT ${this.formatValue(value, options)}`;
  }

  formatAny({ value }, options) {
    return `ANY ${this.formatValue(value, options)}`;
  }

  formatSome({ value }, options) {
    return `SOME ${this.formatValue(value, options)}`;
  }

  formatExists({ value }, options) {
    return `EXISTS ${this.formatValue(value, options)}`;
  }

  formatEqualTo({ field, value }, options) {
    return `${this.formatField(field, options)} = ${this.formatValue(
      value,
      options
    )}`;
  }

  formatNotEqualTo({ field, value }, options) {
    return `${this.formatField(field, options)} <> ${this.formatValue(
      value,
      options
    )}`;
  }

  formatGreaterThan({ field, value }, options) {
    return `${this.formatField(field, options)} > ${this.formatValue(
      value,
      options
    )}`;
  }

  formatGreaterThanOrEqualTo({ field, value }, options) {
    return `${this.formatField(field, options)} >= ${this.formatValue(
      value,
      options
    )}`;
  }

  formatLessThan({ field, value }, options) {
    return `${this.formatField(field, options)} < ${this.formatValue(
      value,
      options
    )}`;
  }

  formatLessThanOrEqualTo({ field, value }, options) {
    return `${this.formatField(field, options)} <= ${this.formatValue(
      value,
      options
    )}`;
  }

  formatIsNull({ field }, options) {
    return `${this.formatField(field, options)} IS NULL`;
  }

  formatIsNotNull({ field }, options) {
    return `${this.formatField(field, options)} IS NOT NULL`;
  }

  formatLike({ field, value }, options) {
    return `${this.formatField(field, options)} LIKE ${this.formatValue(
      value,
      options
    )}`;
  }

  formatBetween({ field, value }, options) {
    // TODO: strict mode: throw if value does not have exactly 2 items
    const between = value
      .map(value => this.formatValue(value, options))
      .join(' AND ');

    return `${this.formatField(field, options)} BETWEEN ${between}`;
  }

  formatIn({ field, value }, options) {
    // TODO: strict mode: warn when value is an empty array
    if (!value.length) {
      value = [null];
    }

    const _in = value.map(value => this.formatValue(value, options)).join(', ');

    return `${this.formatField(field, options)} IN (${_in})`;
  }

  formatAndOrOr({ type, value: values }, options) {
    values = values.map(value => this.formatValue(value, options));

    if (values.length === 1) {
      return values[0];
    }

    const glue = type === 'and' ? ' AND ' : type === 'or' ? ' OR ' : '';

    return `(${values.join(glue)})`;
  }

  formatAnd(sqlPart, options) {
    return this.formatAndOrOr(sqlPart, options);
  }

  formatOr(sqlPart, options) {
    return this.formatAndOrOr(sqlPart, options);
  }

  formatGroupBy({ value: fields }, options) {
    const groupBy = fields
      .map(field => {
        return this.formatValue(field, options, {
          formatValue: value => {
            if (Number.isInteger(value)) {
              return this.formatValue(value, options);
            }

            return this.formatField(value, options);
          }
        });
      })
      .join(', ');

    return `GROUP BY ${groupBy}`;
  }

  // TODO: add formatWindow?

  formatHaving(sqlPart, options) {
    return this.formatWhereOrHaving(sqlPart, options);
  }

  formatAsc({ value }, options) {
    return value ? `ASC ${this.formatValue(value, options)}` : 'ASC';
  }

  formatDesc({ value }, options) {
    return value ? `DESC ${this.formatValue(value, options)}` : 'DESC';
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatNullsFirst(sqlPart, options) {
    return 'NULLS FIRST';
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatNullsLast(sqlPart, options) {
    return 'NULLS LAST';
  }

  formatOrderBy({ value: fields }, options) {
    const orderBy = fields
      .map(field => {
        return this.formatValue(field, options, {
          formatObject: object => {
            return Object.entries(object)
              .map(([field, direction]) => {
                direction = this.formatValue(direction, options, {
                  formatValue: direction => {
                    const lower =
                      typeof direction === 'string' && direction.toLowerCase();

                    if (direction === 1 || lower === 'asc') {
                      const asc = this.constructor.asc();
                      return this.formatAsc(asc, options);
                    }

                    if (direction === -1 || lower === 'desc') {
                      const desc = this.constructor.desc();
                      return this.formatDesc(desc, options);
                    }
                  }
                });

                return `${this.formatField(field, options)} ${direction}`;
              })
              .join(', ');
          },
          formatValue: value => {
            if (Number.isInteger(value)) {
              return this.formatValue(value, options);
            }

            return this.formatField(value, options);
          }
        });
      })
      .join(', ');

    return `ORDER BY ${orderBy}`;
  }

  formatLimitOrOffset({ type, value }, options) {
    const clause =
      type === 'limit' ? 'LIMIT' : type === 'offset' ? 'OFFSET' : '';

    value = this.formatValue(value, options, {
      formatValue: value => {
        value = parseInt(value);

        if (!Number.isInteger(value)) {
          return this.throwSqlError(
            `value for ${inspect(clause)} should be an integer`,
            options
          );
        }

        return this.formatValue(value, options);
      }
    });

    return `${clause} ${value}`;
  }

  formatLimit(sqlPart, options) {
    return this.formatLimitOrOffset(sqlPart, options);
  }

  formatOffset(sqlPart, options) {
    return this.formatLimitOrOffset(sqlPart, options);
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatForUpdate(sqlPart, options) {
    return 'FOR UPDATE';
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatForShare(sqlPart, options) {
    return 'FOR SHARE';
  }

  formatOf({ value: fields }, options) {
    fields = fields.map(field => this.formatField(field, options)).join(', ');

    return `OF ${fields}`;
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatNoWait(sqlPart, options) {
    return 'NOWAIT';
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatSkipLocked(sqlPart, options) {
    return 'SKIP LOCKED';
  }

  formatInsert({ value: parts }, options) {
    const select = parts.map(part => this.formatValue(part, options)).join(' ');

    return `INSERT ${select}`;
  }

  /**
   * @param {SqlPart} sqlPart The part to be formatted.
   */
  formatInto({ value }, options) {
    return `INTO ${this.formatValue(value, options)}`;
  }

  formatColumns({ value }, options) {
    const columns = value
      .map(field => this.formatColumn(field, options))
      .join(', ');

    return `(${columns})`;
  }

  formatValues({ value }, options) {
    // TODO: first figure out how Query will set this up

    // TODO: test values as Query
    // TODO: test values as Part
    // TODO: test values as array
    const values = this.formatValue(value, options, {
      formatArray: array => {
        return array
          .map(row => {
            // TODO: test row as Query
            // TODO: test row as Part
            // TODO: test row as array
            // TODO: test row as empty array
            row = this.formatValue(row, options, {
              formatArray: row => {
                if (!row.length) {
                  return this.throwSqlError(
                    `empty ${inspect('VALUES')} row`,
                    options
                  );
                }
                // TODO: test value as Query
                // TODO: test value as Part
                // TODO: test value as array
                // TODO: test value as object
                // TODO: test value as primitive
                return row
                  .map(value => this.formatValue(value, options))
                  .join(', ');
              }
            });

            return `(${row})`;
          })
          .join(', ');
      }
    });

    return `VALUES ${values}`;
  }

  formatReturning({ value }, options) {
    const returning = value
      .map(field => this.formatField(field, options))
      .join(', ');

    return `RETURNING ${returning}`;
  }

  formatSqlPart(sqlPart, options) {
    const { type } = sqlPart;

    if (type === 'raw') {
      return this.formatRaw(sqlPart, options);
    }

    if (type === 'select') {
      return this.formatSelect(sqlPart, options);
    }

    if (type === 'distinct') {
      return this.formatDistinct(sqlPart, options);
    }

    if (type === 'all') {
      return this.formatAll(sqlPart, options);
    }

    if (type === 'fields') {
      return this.formatFields(sqlPart, options);
    }

    if (type === 'from') {
      return this.formatFrom(sqlPart, options);
    }

    if (type === 'where') {
      return this.formatWhere(sqlPart, options);
    }

    if (type === 'not') {
      return this.formatNot(sqlPart, options);
    }

    if (type === 'any') {
      return this.formatAny(sqlPart, options);
    }

    if (type === 'some') {
      return this.formatSome(sqlPart, options);
    }

    if (type === 'exists') {
      return this.formatExists(sqlPart, options);
    }

    if (type === 'equalTo') {
      return this.formatEqualTo(sqlPart, options);
    }

    if (type === 'notEqualTo') {
      return this.formatNotEqualTo(sqlPart, options);
    }

    if (type === 'greaterThan') {
      return this.formatGreaterThan(sqlPart, options);
    }

    if (type === 'greaterThanOrEqualTo') {
      return this.formatGreaterThanOrEqualTo(sqlPart, options);
    }

    if (type === 'lessThan') {
      return this.formatLessThan(sqlPart, options);
    }

    if (type === 'lessThanOrEqualTo') {
      return this.formatLessThanOrEqualTo(sqlPart, options);
    }

    if (type === 'isNull') {
      return this.formatIsNull(sqlPart, options);
    }

    if (type === 'isNotNull') {
      return this.formatIsNotNull(sqlPart, options);
    }

    if (type === 'like') {
      return this.formatLike(sqlPart, options);
    }

    if (type === 'between') {
      return this.formatBetween(sqlPart, options);
    }

    if (type === 'in') {
      return this.formatIn(sqlPart, options);
    }

    if (type === 'and') {
      return this.formatAnd(sqlPart, options);
    }

    if (type === 'or') {
      return this.formatOr(sqlPart, options);
    }

    if (type === 'groupBy') {
      return this.formatGroupBy(sqlPart, options);
    }

    if (type === 'having') {
      return this.formatHaving(sqlPart, options);
    }

    if (type === 'orderBy') {
      return this.formatOrderBy(sqlPart, options);
    }

    if (type === 'asc') {
      return this.formatAsc(sqlPart, options);
    }

    if (type === 'desc') {
      return this.formatDesc(sqlPart, options);
    }

    if (type === 'nullsFirst') {
      return this.formatNullsFirst(sqlPart, options);
    }

    if (type === 'nullsLast') {
      return this.formatNullsLast(sqlPart, options);
    }

    if (type === 'limit') {
      return this.formatLimit(sqlPart, options);
    }

    if (type === 'offset') {
      return this.formatOffset(sqlPart, options);
    }

    if (type === 'forUpdate') {
      return this.formatForUpdate(sqlPart, options);
    }

    if (type === 'forShare') {
      return this.formatForShare(sqlPart, options);
    }

    if (type === 'of') {
      return this.formatOf(sqlPart, options);
    }

    if (type === 'noWait') {
      return this.formatNoWait(sqlPart, options);
    }

    if (type === 'skipLocked') {
      return this.formatSkipLocked(sqlPart, options);
    }

    if (type === 'insert') {
      return this.formatInsert(sqlPart, options);
    }

    if (type === 'into') {
      return this.formatInto(sqlPart, options);
    }

    if (type === 'columns') {
      return this.formatColumns(sqlPart, options);
    }

    if (type === 'values') {
      return this.formatValues(sqlPart, options);
    }

    if (type === 'returning') {
      return this.formatReturning(sqlPart, options);
    }

    return this.throwSqlError(
      `unsupported SqlPart type ${inspect(type)}`,
      options
    );
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
   * or an object containing `text`, `values` or `fields` properties.
   * @param {string} value.text The raw SQL string. [Prepared
   * statements](https://en.wikipedia.org/wiki/Prepared_statement) are supported
   * and encouraged. Use question marks (?) as placeholders.
   * @param {array} [value.values] The values to be bound to the prepared SQL
   * statement, if there are any placeholders in the raw SQL.
   * @param {array} [value.fields] An array defining the list of fields in the
   * raw SQL that will be returned once the query is executed. For each column
   * returned from the query, there should be a corresponding field in this
   * array. Therefore, the **count** and **order** of fields in the array should
   * match the count and order of columns in the raw SQL.
   *
   * @example Raw SQL with only text:
   * ```js
   * Model.sql.raw('FETCH NEXT 10 ROWS ONLY');
   * ```
   *
   * @example Raw SQL with text (with placeholders) and bind-values:
   * ```js
   * Model.sql.raw({ text: 'UPPER(?)', values: ['foo'] });
   * ```
   *
   * @example Raw SQL with text (with placeholders), bind-values and return
   * fields:
   * ```js
   * Model.sql.raw({
   *  text: 'UPPER(?), LOWER(?)',
   *  values: ['foo', 'bar'],
   *  fields: ['upperFoo', 'lowerBar']
   * });
   * ```
   *
   * @returns {SqlPart} Of type `raw`.
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

  static from(value) {
    return new this.SqlPart({ type: 'from', value });
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

  static nullsFirst() {
    return new this.SqlPart({ type: 'nullsFirst' });
  }

  static nullsLast() {
    return new this.SqlPart({ type: 'nullsLast' });
  }

  static limit(value) {
    return new this.SqlPart({ type: 'limit', value });
  }

  static offset(value) {
    return new this.SqlPart({ type: 'offset', value });
  }

  static forUpdate() {
    return new this.SqlPart({ type: 'forUpdate' });
  }

  static forShare() {
    return new this.SqlPart({ type: 'forShare' });
  }

  static of(value) {
    return new this.SqlPart({ type: 'of', value });
  }

  static noWait() {
    return new this.SqlPart({ type: 'noWait' });
  }

  static skipLocked() {
    return new this.SqlPart({ type: 'skipLocked' });
  }

  static insert(value) {
    return new this.SqlPart({ type: 'insert', value });
  }

  static into(value) {
    return new this.SqlPart({ type: 'into', value });
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

const Model = require('./Model');
const Query = require('./Query');
