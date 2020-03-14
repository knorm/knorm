const { inspect } = require('util');
const { asArray, inspect: inspectInstance } = require('./util');

class Sql {
  /**
   * Creates a new {@link Sql} instance.
   *
   * @param {Model} Model The {@link Model} that the instance is bound to.
   */
  constructor(Model) {
    /**
     * The {@link Model} class that the {@link Sql} instance is bound to.
     *
     * @type {Model}
     */
    this.Model = Model;
  }

  [inspect.custom](depth, options) {
    return inspectInstance(this, () => this.getValue(), depth, options);
  }

  // TODO: optimise all Array#map, Array#forEach etc

  /**
   * Sets the {@link Sql} instance's value.
   *
   * @param {*} value The value to set.
   *
   * @returns {Sql} The same {@link Sql} instance.
   */
  setValue(value) {
    /**
     * The {@link Sql} instance's value.
     *
     * @type {*}
     */
    this.$value = value;

    return this;
  }

  getValue() {
    return this.$value;
  }

  /**
   * Sets the {@link Sql} instance's qualifier.
   *
   * @param {string} qualifier A string to use for qualifying columns and
   * aliasing ${@link From} values.
   *
   * @returns {Sql} The same {@link Sql} instance.
   */
  setQualifier(qualifier) {
    /**
     * The {@link Sql} instance's qualifier.
     *
     * @type {string}
     */
    this.$qualifier = qualifier;

    return this;
  }

  getQualifier() {
    return this.$qualifier;
  }

  /**
   * Adds a bind-value to the {@link Sql} instance's bind-values.
   *
   * @param {*} value The bind-value to add.
   *
   * @returns {Sql} The same {@link Sql} instance.
   */
  addValue(value) {
    /**
     * The {@link Sql} instance's bind-values.
     *
     * @type {array}
     */
    this.$values = this.$values || [];
    this.$values.push(value);

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
    this.$values = this.$values || [];
    this.$values = this.$values.concat(values);

    return this;
  }

  /**
   * Returns the {@link Sql} instance's bind-values.
   *
   * @returns {array} The {@link Sql} instance's bind-values.
   */
  getValues() {
    return this.$values;
  }

  /**
   * Returns the character to use as a placeholder in SQL texts.
   *
   * @returns {string} The placeholder (`?` by default).
   */
  getPlaceholder() {
    return '?';
  }

  getText() {
    return this.formatValue();
  }

  format() {
    return { text: this.getText(), values: this.getValues() };
  }

  formatValue() {
    this.throwSqlError(
      `${this.constructor.name}.prototype.formatValue is not implemented`
    );
  }

  // TODO: add an Sql for identifiers, that can be used in raw Sqls?
  // (relevant for postgres, where identifiers have to be numbered)
  formatIdentifier(identifier) {
    // TODO: use the database's quote_identifier methods?
    // TODO: use pg-format's `ident` method in @knorm/postgres
    return `"${identifier}"`;
  }

  formatAlias(value, alias) {
    return `${value} AS ${alias}`;
  }

  formatDot(left, right) {
    return `${left}.${right}`;
  }

  formatAliased(value) {
    const qualifier = this.getQualifier();

    return qualifier
      ? this.formatAlias(value, this.formatIdentifier(qualifier))
      : value;
  }

  formatSql(sql) {
    const text =
      sql instanceof this.constructor ? sql.formatValue() : sql.getText();
    const values = sql.getValues();

    values && this.addValues(values);

    return text;
  }

  formatQuery(query) {
    const select = query.prepareFetch();
    const text = this.formatSql(select);

    // TODO: always with parens?
    return `(${text})`;
  }

  formatQueryAliased(query) {
    return this.formatAliased(this.formatQuery(query));
  }

  formatModel(Model) {
    const { table, schema } = Model;

    if (!table) {
      return this.throwSqlError(`${Model.name}: table not configured`);
    }

    return schema
      ? this.formatDot(
          this.formatIdentifier(schema),
          this.formatIdentifier(table)
        )
      : this.formatIdentifier(table);
  }

  formatModelAliased(Model) {
    return this.formatAliased(this.formatModel(Model));
  }

  formatField(field) {
    if (typeof field === 'string') {
      field = this.Model.getField(field);
    }

    if (!field.column) {
      return this.throwSqlError(
        `${field.Model.name}.fields.${field.name}: column not configured`
      );
    }

    return this.formatIdentifier(field.column);
  }

  formatFieldQualified(field) {
    if (typeof field === 'string') {
      field = this.Model.getField(field);
    }

    const column = this.formatField(field);
    const qualifier = this.getQualifier();
    const columnQualifier = qualifier
      ? this.formatIdentifier(qualifier)
      : this.formatModel(field.Model);

    return this.formatDot(columnQualifier, column);
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

      return this.formatModelAliased(value);
    }

    if (value instanceof Field) {
      if (formatField) {
        return formatField(value, this);
      }

      return this.formatFieldQualified(value);
    }

    if (value instanceof Query) {
      if (formatQuery) {
        return formatQuery(value, this);
      }

      return this.formatQueryAliased(value);
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

  formatExpressions(array, options = {}) {
    const { glue = ', ', formatExpression } = options;

    const expressions = [];

    for (const item of array) {
      expressions.push(
        formatExpression
          ? formatExpression(item, this)
          : this.formatExpression(item)
      );
    }

    return expressions.join(glue);
  }

  formatFieldExpression(field) {
    return this.formatExpression(field, {
      formatPrimitive: fieldName => {
        return this.formatFieldQualified(fieldName);
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

  formatIntegerOrFieldExpression(value) {
    if (Number.isInteger(value)) {
      return this.formatExpression(value);
    }

    return this.formatFieldExpression(value);
  }

  formatTrueOrOtherExpression(expression) {
    return this.formatExpression(expression, {
      formatPrimitive: value => {
        if (value === true) {
          return '';
        }

        return this.formatPrimitive(value);
      }
    });
  }

  formatConditionExpression(expression) {
    return this.formatExpression(expression, {
      formatObject: object => {
        const expressions = [];

        for (const [field, value] of Object.entries(object)) {
          expressions.push(
            `${this.formatFieldQualified(field)} = ${this.formatExpression(
              value
            )}`
          );
        }

        return expressions.join(' AND ');
      }
    });
  }

  formatConditionExpressions(expressions) {
    return this.formatExpressions(expressions, {
      glue: ' AND ',
      formatExpression: item => this.formatConditionExpression(item)
    });
  }

  throwSqlError(message) {
    throw new this.constructor.SqlError({ message, sql: this });
  }

  createParts(queryOptions) {
    if (queryOptions instanceof QueryOptions) {
      queryOptions = queryOptions.getQualifier();
    }

    const parts = {};

    for (const [name, value] of Object.entries(queryOptions)) {
      if (typeof this[name] === 'function') {
        parts[name] = this[name](value);
      }
    }

    return parts;
  }

  createPart(name, value) {
    const part = new this.constructor[name](this.Model).setValue(value);
    const qualifier = this.getQualifier();

    if (qualifier) {
      part.setQualifier(qualifier);
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

    return this.createPart('Raw', value);
  }

  select(value) {
    return this.createPart('Select', value);
  }

  distinct(value = true) {
    return this.createPart('Distinct', value);
  }

  default() {
    return this.createPart('Default');
  }

  defaultValues() {
    return this.createPart('DefaultValues');
  }

  all(value = true) {
    return this.createPart('All', value);
  }

  and(value) {
    return this.createPart('And', asArray(value));
  }

  as(value, alias, columns) {
    return this.createPart('As', { value, alias, columns });
  }

  field(value) {
    return this.createPart('Field', value);
  }

  fields(value) {
    return this.createPart('Fields', asArray(value));
  }

  from(value) {
    return this.createPart('From', asArray(value));
  }

  where(value) {
    return this.createPart('Where', asArray(value));
  }

  not(value) {
    return this.createPart('Not', value);
  }

  any(value) {
    return this.createPart('Any', value);
  }

  some(value) {
    return this.createPart('Some', value);
  }

  exists(value) {
    return this.createPart('Exists', value);
  }

  equalTo(field, value) {
    return this.createPart('EqualTo', { field, value });
  }

  notEqualTo(field, value) {
    return this.createPart('NotEqualTo', { field, value });
  }

  greaterThan(field, value) {
    return this.createPart('GreaterThan', { field, value });
  }

  greaterThanOrEqualTo(field, value) {
    return this.createPart('GreaterThanOrEqualTo', { field, value });
  }

  lessThan(field, value) {
    return this.createPart('LessThan', { field, value });
  }

  lessThanOrEqualTo(field, value) {
    return this.createPart('LessThanOrEqualTo', { field, value });
  }

  isNull(field) {
    return this.createPart('IsNull', { field });
  }

  isNotNull(field) {
    return this.createPart('IsNotNull', { field });
  }

  like(field, value) {
    return this.createPart('Like', { field, value });
  }

  between(field, value1, value2) {
    return this.createPart('Between', { field, value1, value2 });
  }

  in(field, value) {
    return this.createPart('In', { field, value });
  }

  or(value) {
    return this.createPart('Or', asArray(value));
  }

  groupBy(value) {
    return this.createPart('GroupBy', asArray(value));
  }

  having(value) {
    return this.createPart('Having', asArray(value));
  }

  orderBy(value) {
    return this.createPart('OrderBy', asArray(value));
  }

  asc(value = true) {
    return this.createPart('Asc', value);
  }

  desc(value = true) {
    return this.createPart('Desc', value);
  }

  nullsFirst() {
    return this.createPart('NullsFirst');
  }

  nullsLast() {
    return this.createPart('NullsLast');
  }

  limit(value) {
    return this.createPart('Limit', value);
  }

  offset(value) {
    return this.createPart('Offset', value);
  }

  forUpdate(value = true) {
    return this.createPart('ForUpdate', value);
  }

  forShare(value = true) {
    return this.createPart('ForShare', value);
  }

  of(value) {
    return this.createPart('Of', asArray(value));
  }

  nowait() {
    return this.createPart('Nowait');
  }

  skipLocked() {
    return this.createPart('SkipLocked');
  }

  insert(value) {
    return this.createPart('Insert', value);
  }

  into(value) {
    return this.createPart('Into', value);
  }

  columns(value) {
    return this.createPart('Columns', asArray(value));
  }

  values(value) {
    return this.createPart('Values', asArray(value));
  }

  returning(value) {
    return this.createPart('Returning', asArray(value));
  }
}

module.exports = Sql;

const Field = require('./Field');
const Model = require('./Model');
const Query = require('./Query');
const QueryOptions = require('./QueryOptions');

Sql.SqlError = require('./Sql/SqlError');

Sql.Raw = require('./Sql/Raw');
Sql.Select = require('./Sql/Select');
Sql.Distinct = require('./Sql/Distinct');
Sql.Default = require('./Sql/Default');
Sql.DefaultValues = require('./Sql/DefaultValues');
Sql.All = require('./Sql/All');
Sql.And = require('./Sql/And');
Sql.As = require('./Sql/As');
Sql.Field = require('./Sql/Field');
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
