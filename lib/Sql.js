const { inspect } = require('util');

class Sql {
  /**
   * Creates a new {@link Sql} instance.
   *
   * @param {Model} Model The {@link Model} that the instance is bound to.
   * @param {*} value The {@link Sql} instance's value.
   */
  constructor(Model, value) {
    /**
     * The {@link Model} class that the {@link Sql} instance is bound to.
     *
     * @type {Model}
     */
    this.Model = Model;

    /**
     * The {@link Sql} instance's value.
     *
     * @type {*}
     */
    this.value = value;

    /**
     * The {@link Sql} instance's formatting options.
     *
     * @type {object}
     */
    this.options = undefined;

    /**
     * The {@link Sql} instance's bind-values.
     *
     * @type {array}
     */
    this.values = undefined;
  }

  // TODO: optimise all Array#map, Array#forEach etc

  /**
   * Sets the {@link Sql} instance's formatting options.
   *
   * @param {object} [options] The {@link Sql} instance's formatting options.
   * @param {string} [options.qualifier] A string to use for qualifying columns.
   *
   * @returns {Sql} The same {@link Sql} instance.
   */
  setOptions(options) {
    this.options = options;

    return this;
  }

  /**
   * Adds a bind-value to the {@link Sql} instance's bind-values.
   *
   * @param {*} value The value to add.
   *
   * @returns {Sql} The same {@link Sql} instance.
   */
  addValue(value) {
    this.values = this.values || [];
    this.values.push(value);

    return this;
  }

  /**
   * Adds multiple bind-values to the {@link Sql} instance's bind-values.
   *
   * @param {array} values The values to add.
   *
   * @returns {Sql} The same {@link Sql} instance.
   */
  addValues(values) {
    this.values = this.values || [];
    this.values = this.values.concat(values);

    return this;
  }

  /**
   * Returns the {@link Sql} instance's bind-values.
   *
   * @returns {array} The {@link Sql} instance's bind-values.
   */
  getValues() {
    return this.values;
  }

  getText() {
    this.throwSqlError(
      `${this.constructor.name}.prototype.getText is not implemented`
    );
  }

  /**
   * Returns the character to use as a placeholder in SQL texts.
   *
   * @returns {string} The placeholder (`?` by default).
   */
  getPlaceholder() {
    return '?';
  }

  // TODO: add an Sql for identifiers, that can be used in raw Sqls?
  // (relevant for postgres, where identifiers have to be numbered)
  formatIdentifier(identifier) {
    // TODO: use the database's quote_identifier methods?
    // TODO: use pg-format's `ident` method in @knorm/postgres
    return `"${identifier}"`;
  }

  formatQualifier(value, qualifier) {
    return `${qualifier}.${value}`;
  }

  formatModel(Model) {
    const { table, schema } = Model;

    if (!table) {
      return this.throwSqlError(`${Model.name}: table not configured`);
    }

    return schema
      ? this.formatQualifier(
          this.formatIdentifier(table),
          this.formatIdentifier(schema)
        )
      : this.formatIdentifier(table);
  }

  formatField(field, { qualify = true } = {}) {
    if (!field.column) {
      return this.throwSqlError(
        `${field.Model.name}.fields.${field.name}: column not configured`
      );
    }

    const column = this.formatIdentifier(field.column);

    if (!qualify) {
      return column;
    }

    const qualifier =
      this.options && this.options.qualifier
        ? this.formatIdentifier(this.options.qualifier)
        : this.formatModel(field.Model);

    return this.formatQualifier(column, qualifier);
  }

  formatQuery(query) {
    const { text, values } = query.formatSelect();

    values && this.addValues(values);

    // TODO: always with parens?
    return `(${text})`;
  }

  formatSql(sql) {
    const { text, values } = sql.format();

    values && this.addValues(values);

    return text;
  }

  formatPrimitive(value) {
    this.addValue(value);

    return this.getPlaceholder();
  }

  formatArray(array) {
    return this.formatPrimitive(array);
  }

  formatObject(object) {
    return this.formatPrimitive(object);
  }

  formatExpression(
    value,
    {
      formatModel,
      formatField,
      formatQuery,
      formatSql,
      formatArray,
      formatObject,
      formatPrimitive
    } = {}
  ) {
    if (value === undefined) {
      return this.throwSqlError(`value is ${inspect(value)}`);
    }

    // TODO: document that Model and Query overloads (e.g.
    // Knorm.prototype.Query) should extend Model, Query etc because of
    // instanceof checks

    // TODO: what should the param signature for formatters be?

    if (value && value.prototype instanceof Model) {
      if (formatModel) {
        return formatModel(value, this);
      }

      return this.formatModel(value);
    }

    if (value instanceof Field) {
      if (formatField) {
        return formatField(value, this);
      }

      return this.formatField(value);
    }

    if (value instanceof Query) {
      if (formatQuery) {
        return formatQuery(value, this);
      }

      return this.formatQuery(value);
    }

    if (value instanceof Sql) {
      if (formatSql) {
        return formatSql(value, this);
      }

      return this.formatSql(value);
    }

    if (Array.isArray(value)) {
      if (formatArray) {
        return formatArray(value, this);
      }

      return this.formatArray(value);
    }

    if (typeof value === 'object' && value !== null) {
      if (formatObject) {
        return formatObject(value, this);
      }

      return this.formatObject(value);
    }

    if (formatPrimitive) {
      return formatPrimitive(value, this);
    }

    return this.formatPrimitive(value);
  }

  formatColumnExpression(field, options) {
    return this.formatExpression(field, {
      formatPrimitive: fieldName => {
        const field = this.Model.fields[fieldName];

        if (!field) {
          return this.throwSqlError(`unknown field ${inspect(fieldName)}`);
        }

        return this.formatField(field, options);
      }
    });
  }

  formatIntegerExpression(value) {
    return this.formatExpression(value, {
      formatPrimitive: value => {
        value = parseInt(value);

        if (!Number.isInteger(value)) {
          return this.throwSqlError('value should be an integer');
        }

        return this.formatExpression(value);
      }
    });
  }

  formatIntegerOrColumnExpression(value) {
    if (Number.isInteger(value)) {
      return this.formatExpression(value);
    }

    return this.formatColumnExpression(value);
  }

  formatConditionExpression(condition) {
    return this.formatExpression(condition, {
      formatArray: conditions => {
        conditions = conditions.map(value => {
          return this.formatExpression(value, {
            formatObject: object => {
              const conditions = Object.entries(object).map(
                ([field, value]) => {
                  return this.equalTo({ field, value });
                }
              );

              return this.formatSql(this.and(conditions));
            }
          });
        });

        return this.formatSql(this.and(conditions));
      }
    });
  }

  formatTrueOrOtherExpression(expression) {
    return this.formatExpression(expression, {
      formatPrimitive: value => {
        if (value === true) {
          return;
        }

        return this.formatPrimitive(value);
      }
    });
  }

  format() {
    return {
      text: this.getText(),
      values: this.getValues(),
      fields: this.getFields()
    };
  }

  throwSqlError(message) {
    throw new this.constructor.SqlError({ message, sql: this });
  }

  createSqlPart(name, value) {
    const part = new this.constructor[name](this.Model, value);

    if (this.options) {
      part.setOptions(this.options);
    }

    return part;
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
   * @example Raw SQL with text (with placeholders), bind-values and
   * return-fields:
   * ```js
   * Model.sql.raw({
   *  text: 'UPPER(?), LOWER(?)',
   *  values: ['foo', 'bar'],
   *  fields: ['upperFoo', 'lowerBar']
   * });
   * ```
   *
   * @returns {Raw}
   */
  raw(value) {
    if (typeof value === 'string') {
      value = { text: value };
    }

    return this.createSqlPart('Raw', value);
  }

  select(value) {
    return this.createSqlPart('Select', value);
  }

  distinct(value = true) {
    return this.createSqlPart('Distinct', value);
  }

  default() {
    return this.createSqlPart('Default');
  }

  defaultValues() {
    return this.createSqlPart('DefaultValues');
  }

  all(value = true) {
    return this.createSqlPart('All', value);
  }

  and(value) {
    return this.createSqlPart('And', value);
  }

  as(value, alias, columns) {
    return this.createSqlPart('As', { value, alias, columns });
  }

  fields(value) {
    return this.createSqlPart('Fields', value);
  }

  from(value) {
    return this.createSqlPart('From', value);
  }

  where(value) {
    return this.createSqlPart('Where', value);
  }

  not(value) {
    return this.createSqlPart('Not', value);
  }

  any(value) {
    return this.createSqlPart('Any', value);
  }

  some(value) {
    return this.createSqlPart('Some', value);
  }

  exists(value) {
    return this.createSqlPart('Exists', value);
  }

  equalTo(field, value) {
    return this.createSqlPart('EqualTo', { field, value });
  }

  notEqualTo(field, value) {
    return this.createSqlPart('NotEqualTo', { field, value });
  }

  greaterThan(field, value) {
    return this.createSqlPart('GreaterThan', { field, value });
  }

  greaterThanOrEqualTo(field, value) {
    return this.createSqlPart('GreaterThanOrEqualTo', { field, value });
  }

  lessThan(field, value) {
    return this.createSqlPart('LessThan', { field, value });
  }

  lessThanOrEqualTo(field, value) {
    return this.createSqlPart('LessThanOrEqualTo', { field, value });
  }

  isNull(field) {
    return this.createSqlPart('IsNull', { field });
  }

  isNotNull(field) {
    return this.createSqlPart('IsNotNull', { field });
  }

  like(field, value) {
    return this.createSqlPart('Like', { field, value });
  }

  between(field, value1, value2) {
    let value;

    if (Array.isArray(value1)) {
      value = value1;
    } else {
      value = [value1, value2];
    }

    return this.createSqlPart('Between', { field, value });
  }

  in(field, value) {
    return this.createSqlPart('In', { field, value });
  }

  or(value) {
    return this.createSqlPart('Or', value);
  }

  groupBy(value) {
    return this.createSqlPart('GroupBy', value);
  }

  having(value) {
    return this.createSqlPart('Having', value);
  }

  orderBy(value) {
    return this.createSqlPart('OrderBy', value);
  }

  asc(value = true) {
    return this.createSqlPart('Asc', value);
  }

  desc(value = true) {
    return this.createSqlPart('Desc', value);
  }

  nullsFirst() {
    return this.createSqlPart('NullsFirst');
  }

  nullsLast() {
    return this.createSqlPart('NullsLast');
  }

  limit(value) {
    return this.createSqlPart('Limit', value);
  }

  offset(value) {
    return this.createSqlPart('Offset', value);
  }

  forUpdate(value = true) {
    return this.createSqlPart('ForUpdate', value);
  }

  forShare(value = true) {
    return this.createSqlPart('ForShare', value);
  }

  of(value) {
    return this.createSqlPart('Of', value);
  }

  nowait() {
    return this.createSqlPart('Nowait');
  }

  skipLocked() {
    return this.createSqlPart('SkipLocked');
  }

  insert(value) {
    return this.createSqlPart('Insert', value);
  }

  into(value) {
    return this.createSqlPart('Into', value);
  }

  columns(value) {
    return this.createSqlPart('Columns', value);
  }

  values(value) {
    return this.createSqlPart('Values', value);
  }

  returning(value) {
    return this.createSqlPart('Returning', value);
  }
}

module.exports = Sql;

const Field = require('./Field');
const Model = require('./Model');
const Query = require('./Query');

Sql.SqlError = require('./Sql/SqlError');

Sql.Raw = require('./Sql/Raw');
Sql.Select = require('./Sql/Select');
Sql.Distinct = require('./Sql/Distinct');
Sql.Default = require('./Sql/Default');
Sql.DefaultValues = require('./Sql/DefaultValues');
Sql.All = require('./Sql/All');
Sql.And = require('./Sql/And');
Sql.As = require('./Sql/As');
Sql.Fields = require('./Sql/Fields');
Sql.From = require('./Sql/From');
Sql.Where = require('./Sql/Where');
Sql.Not = require('./Sql/Not');
Sql.Any = require('./Sql/Any');
Sql.Some = require('./Sql/Some');
Sql.Exists = require('./Sql/Exists');
Sql.EqualTo = require('./Sql/EqualTo');
Sql.NotEqualTo = require('./Sql/NotEqualTo');
Sql.GreaterThan = require('./Sql/GreaterThan');
Sql.GreaterThanOrEqualTo = require('./Sql/GreaterThanOrEqualTo');
Sql.LessThan = require('./Sql/LessThan');
Sql.LessThanOrEqualTo = require('./Sql/LessThanOrEqualTo');
Sql.IsNull = require('./Sql/IsNull');
Sql.IsNotNull = require('./Sql/IsNotNull');
Sql.Like = require('./Sql/Like');
Sql.Between = require('./Sql/Between');
Sql.In = require('./Sql/In');
Sql.Or = require('./Sql/Or');
Sql.GroupBy = require('./Sql/GroupBy');
Sql.Having = require('./Sql/Having');
Sql.OrderBy = require('./Sql/OrderBy');
Sql.Asc = require('./Sql/Asc');
Sql.Desc = require('./Sql/Desc');
Sql.NullsFirst = require('./Sql/NullsFirst');
Sql.NullsLast = require('./Sql/NullsLast');
Sql.Limit = require('./Sql/Limit');
Sql.Offset = require('./Sql/Offset');
Sql.ForUpdate = require('./Sql/ForUpdate');
Sql.ForShare = require('./Sql/ForShare');
Sql.Of = require('./Sql/Of');
Sql.Nowait = require('./Sql/Nowait');
Sql.SkipLocked = require('./Sql/SkipLocked');
Sql.Insert = require('./Sql/Insert');
Sql.Into = require('./Sql/Into');
Sql.Columns = require('./Sql/Columns');
Sql.Values = require('./Sql/Values');
Sql.Returning = require('./Sql/Returning');
