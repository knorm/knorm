const { inspect } = require('util');
const { inspectInstance, asArray } = require('./util');

class QueryOptions {
  constructor(Model) {
    this.Model = Model;
    this.$values = {};
  }

  [inspect.custom](depth, options) {
    return inspectInstance(this, () => this.getOptions(), depth, options);
  }

  // TODO: tests

  setValue(name, value, castValue) {
    if (value === undefined) {
      return this;
    }

    if (value === null) {
      this.$values[name] = null;
      return this;
    }

    if (castValue) {
      value = castValue(value);
    }

    if (Array.isArray(value)) {
      this.$values[name] = this.$values[name] || [];
      this.$values[name] = this.$values[name].concat(value);
    } else {
      this.$values[name] = value;
    }

    return this;
  }

  setBooleanValue(name, value) {
    return this.setValue(name, value, value => !!value);
  }

  setIntegerValue(name, value) {
    return this.setValue(name, value, value => parseInt(value));
  }

  setStringValue(name, value) {
    return this.setValue(name, value, value => String(value));
  }

  setArrayValue(name, value) {
    // TODO: allow arrays of arrays??
    return this.setValue(name, value, value => asArray(value));
  }

  unsetValue(name) {
    return this.setValue(name, null);
  }

  unsetValues(names) {
    for (const name of names) {
      this.unsetValue(name);
    }

    return this;
  }

  setValues(values) {
    this.$values = values;

    return this;
  }

  getValues() {
    return this.$values;
  }

  getValue(name) {
    return this.$values[name];
  }

  hasValue(name) {
    return this.$values[name] !== undefined && this.$values[name] !== null;
  }

  // TODO: some other name?
  getOptions(names) {
    if (!names) {
      names = Object.keys(this.$values);
    }

    const options = {};

    for (const name of names) {
      const value = this.$values[name];

      if (value !== undefined && value !== null) {
        options[name] = value;
      }
    }

    return options;
  }

  // TODO: setValuesByMethod?
  setOptions(options) {
    for (const [name, value] of Object.entries(options)) {
      this[name](value);
    }

    return this;
  }

  // TODO: setValueByMethod?
  setOption(name, value) {
    this[name](value);

    return this;
  }

  debug(debug = true) {
    return this.setBooleanValue('debug', debug);
  }

  require(require = true) {
    return this.setBooleanValue('require', require);
  }

  from(from) {
    return this.setArrayValue('from', from);
  }

  qualifier(qualifier) {
    return this.setStringValue('qualifier', qualifier);
  }

  subquery(subquery = true) {
    return this.setBooleanValue('subquery', subquery);
  }

  /**
   * Configures the batch-size for {@link Query#insert} and {@link Query#update}
   * (where batch updates are supported). When a batch-size is configured and
   * either of these operations is called with an array of data, multiple
   * queries will be sent to the database instead of a single one. If any data
   * is returned from the queries, it is merged into a single array instead of
   * returning multiple arrays.
   *
   * ::: tip INFO
   * The queries are sent to the database in parallel (i.e. via `Promise.all`).
   * Take that into consideration when deciding how many queries to send vs how
   * many items to have in a single query.
   * :::
   *
   * ::: warning NOTE
   * When using this option, the order of the items in the array returned is
   * unlikely to match the order of the rows in the original array. This is
   * because the queries are sent in parallel and are not guaranteed to complete
   * in the same order.
   * :::
   *
   * @param {number} batchSize The number of items to send in a single INSERT
   * or UPDATE query (where array updates are supported).
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  batchSize(batchSize) {
    return this.setIntegerValue('batchSize', batchSize);
  }

  /**
   * Configures whether or not to return the first item in a result set from the
   * database from a {@link Query#fetch}, {@link Query#insert},
   * {@link Query#update} or {@link Query#delete} operation, instead of
   * returning an array. This is handy when one is sure that there's only one
   * item in the rows returned from the database.
   *
   * @param {boolean} [first=true] If `true`, return the first item, else return
   * an array.
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  first(first = true) {
    return this.setBooleanValue('first', first);
  }

  distinct(distinct = true) {
    return this.setBooleanValue('distinct', distinct);
  }

  /**
   * Configures what fields to return from a database call.
   *
   * ::: tip INFO
   * This is also aliased as {@link Query#returning}.
   * :::
   *
   * @param {string|array|object|boolean} fields The fields to return. When
   * passed as an object, the keys are used as aliases while the values are used
   * in the query, which allows one to use raw SQL. When passed as `false`, no
   * fields will be returned from the database call.
   *
   * @example Using raw SQL for PostgreSQL:
   * ```js{10}
   * Model.insert(
   *   {
   *     firstName: 'Foo',
   *     lastName: 'Bar',
   *   },
   *   {
   *     returning: {
   *       firstName: 'firstName',
   *       lastName: 'lastName',
   *       fullNames: Model.query.sql(`"firstName" || ' ' || upper("lastName")`)
   *     }
   *   }
   * );
   * ```
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  fields(fields) {
    // TODO: use short field aliases expect in strict/debug mode
    // TODO: strict mode: throw if the field is not a valid model field
    return this.setArrayValue('fields', fields);
  }

  /**
   * Configures what fields to return from a database call.
   *
   * ::: tip INFO
   * This is an alias for {@link Query#fields}.
   * :::
   *
   * @param {string|array|object|boolean} fields The fields to return.
   *
   * @see {@link Query#fields}

   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  returning(fields) {
    return this.fields(fields);
  }

  /**
   * Alias for {@link Query#fields}, improves code readability when configuring a
   * single field.
   *
   * ::: tip INFO
   * This is an alias for {@link Query#fields}.
   * :::
   *
   * @param {string|array|object|boolean} field The field to return.
   *
   * @see {@link Query#fields}
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  field(field) {
    return this.fields(field);
  }

  where(where) {
    return this.setArrayValue('where', where);
  }

  groupBy(groupBy) {
    return this.setArrayValue('groupBy', groupBy);
  }

  having(having) {
    return this.setArrayValue('having', having);
  }

  orderBy(orderBy) {
    return this.setArrayValue('orderBy', orderBy);
  }

  limit(limit) {
    return this.setIntegerValue('limit', limit);
  }

  offset(offset) {
    return this.setIntegerValue('offset', offset);
  }

  forUpdate(forUpdate = true) {
    return this.setBooleanValue('forUpdate', forUpdate);
  }

  forShare(forShare = true) {
    return this.setBooleanValue('forShare', forShare);
  }

  of(fields) {
    return this.setArrayValue('of', fields);
  }

  noWait(noWait = true) {
    return this.setBooleanValue('noWait', noWait);
  }

  skipLocked(skipLocked = true) {
    return this.setBooleanValue('skipLocked', skipLocked);
  }

  data(data) {
    return this.setValue('data', data);
  }

  fetch(fetch = true) {
    return this.setBooleanValue('fetch', fetch);
  }

  insert(insert = true) {
    return this.setBooleanValue('insert', insert);
  }

  update(update = true) {
    return this.setBooleanValue('update', update);
  }

  delete(_delete = true) {
    return this.setBooleanValue('delete', _delete);
  }
}

module.exports = QueryOptions;
