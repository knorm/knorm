class QueryOptions {
  _withChecks(value, cast) {
    // ignore `undefined` values
    if (value === undefined) {
      return undefined;
    }

    // support disabling the option (for array-value options)
    if (value === false) {
      return false;
    }

    // support unsetting the option value
    if (value === null) {
      return null;
    }

    return cast(value);
  }

  _getBoolean(value) {
    return this._withChecks(value, value => !!value);
  }

  _getInteger(value) {
    return this._withChecks(value, value => parseInt(value));
  }

  _getString(value) {
    return this._withChecks(value, value => String(value));
  }

  _getArray(value) {
    value = Array.isArray(value) ? value : [value];
    return this._withChecks(value[0], value => value);
  }

  debug(debug = true) {
    return this._getBoolean(debug);
  }

  require(require = true) {
    return this._getBoolean(require);
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
    return this._getInteger(batchSize);
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
    return this._getBoolean(first);
  }

  distinct(distinct = true) {
    return this._getBoolean(distinct);
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
    return this._getArray(fields);
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
    return this._getArray(fields);
  }

  /**
   * Alias for {@link Query#fields}, improves code readability when configuring a
   * single field.
   *
   * ::: tip INFO
   * This is an alias for {@link Query#fields}.
   * :::
   *
   * @param {string|array|object|boolean} fields The field to return.
   *
   * @see {@link Query#fields}
   *
   * @returns {Query} The same {@link Query} instance to allow chaining.
   */
  field(field) {
    return this._getArray(field);
  }

  where(where) {
    return this._getArray(where);
  }

  having(having) {
    return this._getArray(having);
  }

  groupBy(groupBy) {
    return this._getArray(groupBy);
  }

  orderBy(orderBy) {
    return this._getArray(orderBy);
  }

  limit(limit) {
    return this._getInteger(limit);
  }

  offset(offset) {
    return this._getInteger(offset);
  }

  forUpdate(forUpdate = true) {
    return this._getBoolean(forUpdate);
  }

  of(tables) {
    return this._getArray(tables);
  }

  noWait(noWait = true) {
    return this._getBoolean(noWait);
  }
}

module.exports = QueryOptions;
