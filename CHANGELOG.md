# [2.0.0](https://github.com/knorm/knorm/compare/v1.11.2...v2.0.0) (2019-02-03)


### Bug Fixes

* **Model:** filter out `undefined` values in setData ([844a7c3](https://github.com/knorm/knorm/commit/844a7c3))
* **Query:** always alias the table in queries ([0010a47](https://github.com/knorm/knorm/commit/0010a47))
* **Transaction:** run queries outside transaction after transaction ends ([84aa6aa](https://github.com/knorm/knorm/commit/84aa6aa))


### Code Refactoring

* **Field:** do not set `this` for "get default" functions ([96aace4](https://github.com/knorm/knorm/commit/96aace4))
* **Field:** do not set `this` for cast functions ([6d16cdb](https://github.com/knorm/knorm/commit/6d16cdb))
* **Field:** do not set `this` for custom validator functions ([05c59e8](https://github.com/knorm/knorm/commit/05c59e8)), closes [#136](https://github.com/knorm/knorm/issues/136)
* **Field:** remove Field.prototype.hasDefault ([6ffbd96](https://github.com/knorm/knorm/commit/6ffbd96))
* **Field:** remove model registry and Transaction reference ([54e5603](https://github.com/knorm/knorm/commit/54e5603)), closes [#166](https://github.com/knorm/knorm/issues/166)
* **Field:** rename `schema` validator to `shape` ([db950d4](https://github.com/knorm/knorm/commit/db950d4)), closes [#85](https://github.com/knorm/knorm/issues/85)
* **Query:** refactor connection handling ([4e7ef6b](https://github.com/knorm/knorm/commit/4e7ef6b))
* **Query:** refactor interal options into configs ([07591f8](https://github.com/knorm/knorm/commit/07591f8))
* **Query:** remove `forge` and `lean` options ([bb18c1a](https://github.com/knorm/knorm/commit/bb18c1a)), closes [#198](https://github.com/knorm/knorm/issues/198)
* **Transaction:** refactor connection handling ([32875f0](https://github.com/knorm/knorm/commit/32875f0))
* **Transaction:** remove scoped Field, Model and Query classes ([60d061c](https://github.com/knorm/knorm/commit/60d061c)), closes [#166](https://github.com/knorm/knorm/issues/166)


### Features

* **Connection:** add Connection class ([03b4b58](https://github.com/knorm/knorm/commit/03b4b58))
* **Knorm:** add helpers for updating Knorm classes ([5c6b009](https://github.com/knorm/knorm/commit/5c6b009))
* **Knorm:** allow chaining from `addModel` ([fc8a3b2](https://github.com/knorm/knorm/commit/fc8a3b2))
* **Query:** support `false` for `fields` and `returning` options ([71b28d4](https://github.com/knorm/knorm/commit/71b28d4))
* **QueryError:** extract error messages from error instances only ([b75eb0c](https://github.com/knorm/knorm/commit/b75eb0c))
* **Transaction:** add 'started', 'active' and 'ended' flags ([0c5b6b8](https://github.com/knorm/knorm/commit/0c5b6b8))


### BREAKING CHANGES

* **Query:** `Query.prototype.prepareSql` no longer receives
an `options` parameter, instead, those options (`forFetch`,
`forInsert` etc) are stored in `Query.prototype.config`.
* **Field:** JSON validators should now be configured with
a `shape` object (or string) instead of `schema`:
```js
Model.fields = {
  data: {
    type: 'jsonb',
    shape: { // instead of `shape`
      value1: 'string',
      value2: 'integer',
      value3: 'object'
    }
  }
};
```
* **Field:** Removed Field.prototype.hasDefault. Note that
Field.prototype.getDefault returns `undefined` if the field has
no default value configured.
* **Field:** `this` is no longer set to the Model instance for
a Field's cast functions. Instead, the Model instance is passed as
a parameter. See the Field docs for more info.
* **Field:** `this` is no longer set to the Model instance for
functions that return a Field's default value. Instead, the Model
instance is passed as a parameter. See the Field docs for more info.
* **Field:** `this` is no longer set to the Model instance in
custom validator functions. Instead, the Model instance is passed
as a parameter. See the Field docs for more info.
* **Transaction:** Removed Transaction.prototype.query. Now, Transaction
does not completely override the query execution by Query. It only
overrides Query.prototype.connect and Query.prototype.close to ensure
all queries within the transaction are run on the same database
connection.
* **Query:** Removed Query.prototype.forge and
Query.prototype.lean. These slightly improve data-parsing
performance but do so by removing features e.g. value-casting.
More info here: https://github.com/knorm/knorm/issues/198.
* **Query:** When the `batchSize` option is set, Query.prototype.insert and
Query.prototype.update, run multiple queries *on the same database connection*.
Previously, the queries would be run in different connections. Specifically,
Query.prototype.execute is called once (with all the queries as an array), while
Query.prototype.query is called repeatedly, once for each query.
* **Query:** When query errors occur, the SQL that led to the error is no
longer attached to the error's `sql` property, but rather the `originalError.sql`
property. Also, its value is now always an object with `text` and `values`
properties. The `value` property is only added in the debug mode though.
* **Query:** Renamed Query.prototype.acquireClient to Query.prototype.connect,
which calls Connection.prototye.create.
* **Query:** Renamed Query.prototype.releaseClient to Query.prototype.close,
which calls Connection.prototype.close.
* **Field:** Removed:
- `Field.prototype.models` and `Field.models`
- `Field.prototype.transaction` and `Field.transaction`
* **Transaction:** Removed:
- `Transaction.prototype.Field`
- `Transaction.prototype.Model`
- `Transaction.prototype.Query`
* **Query:** Query.prototype.query was renamed to Query.prototype.execute,
but a new Query.prototype.query method was added. Query.prototype.execute
handles the entire query life-cycle, from creating a database connection,
formatting and running SQL to closing the connection. See the Query API docs
for more info.

## [1.11.2](https://github.com/knorm/knorm/compare/v1.11.1...v1.11.2) (2019-01-17)


### Bug Fixes

* **Model:** fix `schema` inheritance ([94dfa37](https://github.com/knorm/knorm/commit/94dfa37))

## [1.11.1](https://github.com/knorm/knorm/compare/v1.11.0...v1.11.1) (2018-11-14)


### Bug Fixes

* **Query:** fix erroneous "where is (not) null" validation ([201db1c](https://github.com/knorm/knorm/commit/201db1c))

# [1.11.0](https://github.com/knorm/knorm/compare/v1.10.0...v1.11.0) (2018-11-06)


### Features

* **Query:** add support for `noWait` ([c03ddad](https://github.com/knorm/knorm/commit/c03ddad))

# [1.10.0](https://github.com/knorm/knorm/compare/v1.9.1...v1.10.0) (2018-10-12)


### Bug Fixes

* **Field:** support new `schema` validators from custom validators ([ba56285](https://github.com/knorm/knorm/commit/ba56285))


### Features

* **Field:** pass model instance as param to custom validator ([5097be4](https://github.com/knorm/knorm/commit/5097be4))

## [1.9.1](https://github.com/knorm/knorm/compare/v1.9.0...v1.9.1) (2018-10-08)


### Bug Fixes

* **Query:** add model-name to query error ([bfdb861](https://github.com/knorm/knorm/commit/bfdb861))

<a name="1.9.0"></a>
# [1.9.0](https://github.com/knorm/knorm/compare/v1.8.0...v1.9.0) (2018-09-28)


### Bug Fixes

* **Knorm:** always create a scoped Field class ([0e8ced9](https://github.com/knorm/knorm/commit/0e8ced9))
* **Transaction:** update `Field.prototype.models` ([19e5363](https://github.com/knorm/knorm/commit/19e5363))
* **Transaction:** update scoped static model accessors ([d27769e](https://github.com/knorm/knorm/commit/d27769e))


### Features

* **Query:** add before and after-query hooks ([db2eb85](https://github.com/knorm/knorm/commit/db2eb85))
* **Transaction:** add `transaction` to scoped classes ([e8ea4a2](https://github.com/knorm/knorm/commit/e8ea4a2))
* **Transaction:** add before and after-query hooks ([3bb2b50](https://github.com/knorm/knorm/commit/3bb2b50))



<a name="1.8.0"></a>
# [1.8.0](https://github.com/knorm/knorm/compare/v1.7.2...v1.8.0) (2018-09-25)


### Features

* **Query:** support raw sql in fetch fields ([57994c1](https://github.com/knorm/knorm/commit/57994c1))



<a name="1.7.2"></a>
## [1.7.2](https://github.com/knorm/knorm/compare/v1.7.1...v1.7.2) (2018-09-25)


### Bug Fixes

* **Query:** ignore non-insert options for inserts ([1b0b4bd](https://github.com/knorm/knorm/commit/1b0b4bd))



<a name="1.7.1"></a>
## [1.7.1](https://github.com/knorm/knorm/compare/v1.7.0...v1.7.1) (2018-09-25)


### Bug Fixes

* **Field:** handle overloaded Field class in JSON validators ([a0e6964](https://github.com/knorm/knorm/commit/a0e6964))



<a name="1.7.0"></a>
# [1.7.0](https://github.com/knorm/knorm/compare/v1.6.2...v1.7.0) (2018-09-23)


### Bug Fixes

* **Field:** support overloaded Query.prototype.sql ([e123a9d](https://github.com/knorm/knorm/commit/e123a9d))


### Features

* support inserts/updates with raw sql ([8ec7c5b](https://github.com/knorm/knorm/commit/8ec7c5b))



<a name="1.6.2"></a>
## [1.6.2](https://github.com/knorm/knorm/compare/v1.6.1...v1.6.2) (2018-08-23)


### Bug Fixes

* **Model:** do not duplicate Model.config.fieldNames ([4fe3cbb](https://github.com/knorm/knorm/commit/4fe3cbb))



<a name="1.6.1"></a>
## [1.6.1](https://github.com/knorm/knorm/compare/v1.6.0...v1.6.1) (2018-08-22)


### Bug Fixes

* **NoRowsError:** add a reference to the query instance ([2a627d9](https://github.com/knorm/knorm/commit/2a627d9))



<a name="1.6.0"></a>
# [1.6.0](https://github.com/knorm/knorm/compare/v1.5.0...v1.6.0) (2018-08-21)


### Features

* **Field:** support non-matching regex validators ([52a7d72](https://github.com/knorm/knorm/commit/52a7d72))



<a name="1.5.0"></a>
# [1.5.0](https://github.com/knorm/knorm/compare/v1.4.1...v1.5.0) (2018-08-19)


### Features

* **Query:** add `hasOption` and `unsetOption` ([17ad152](https://github.com/knorm/knorm/commit/17ad152))
* **Query:** add `Query.prototype.clone` ([2315c45](https://github.com/knorm/knorm/commit/2315c45))
* **Query:** add `unsetOptions` and `getOption` ([d896aec](https://github.com/knorm/knorm/commit/d896aec))



<a name="1.4.2"></a>
## [1.4.2](https://github.com/knorm/knorm/compare/v1.4.1...v1.4.2) (2018-08-16)


### Bug Fixes

* **Query:** fix handling of string options ([2125f6e](https://github.com/knorm/knorm/commit/2125f6e))



<a name="1.4.1"></a>

## [1.4.1](https://github.com/knorm/knorm/compare/v1.2.1...v1.4.1) (2018-08-15)

### Features

* **Query:** add support for `FOR UPDATE OF`

```js
Model.fetch({ forUpdate: true, of: ['table'] });
Model.query.forUpdate().of('table').fetch();
```

<a name="1.4.0"></a>

## [1.4.0](https://github.com/knorm/knorm/compare/v1.2.1...v1.4.0) (2018-08-15)

### VERSION DELETED

<a name="1.3.0"></a>

## [1.3.0](https://github.com/knorm/knorm/compare/v1.2.1...v1.3.0) (2018-08-13)

### Features

* support configuring a model's schema name

```js
Model.schema = 'schema';
Model.table = 'table';
```

<a name="1.2.1"></a>

## [1.2.1](https://github.com/knorm/knorm/compare/v1.2.0...v1.2.1) (2018-08-07)

### Bug Fixes

* **Field:** handle `undefined` in array json schemas ([bd0367f](https://github.com/knorm/knorm/commit/bd0367f))

<a name="1.2.0"></a>

# [1.2.0](https://github.com/knorm/knorm/compare/v1.1.0...v1.2.0) (2018-07-30)

### Features

* **Model:** allow setting query and plugin options ([83f8dba](https://github.com/knorm/knorm/commit/83f8dba))
* **Model:** set default query options ([37dffbe](https://github.com/knorm/knorm/commit/37dffbe))

<a name="1.1.0"></a>

# [1.1.0](https://github.com/knorm/knorm/compare/v1.0.1...v1.1.0) (2018-07-26)

### Features

* **Query:** add the failing sql to query errors ([ad8c9da](https://github.com/knorm/knorm/commit/ad8c9da))

<a name="1.0.1"></a>

## [1.0.1](https://github.com/knorm/knorm/compare/v1.0.0...v1.0.1) (2018-07-05)

### Bug Fixes

* **Query:** add validation for undefined `where` values ([de888d8](https://github.com/knorm/knorm/commit/de888d8))

<a name="1.0.0"></a>

# [1.0.0](https://github.com/knorm/knorm/compare/v1.0.0-next...v1.0.0) (2018-06-27)

<a name="1.0.0-next"></a>

# [1.0.0-next](https://github.com/knorm/knorm/compare/v0.11.1...v1.0.0-next) (2018-06-27)

### Bug Fixes

* **Field:** JSON.parse and validate json fields ([44ec983](https://github.com/knorm/knorm/commit/44ec983))
* **Field:** throw validation errors for invalid JSON strings ([aa82671](https://github.com/knorm/knorm/commit/aa82671))
* **Knorm:** allow plugins to update base Model class ([bd8f182](https://github.com/knorm/knorm/commit/bd8f182))
* **Knorm:** enable plugins to access themselves ([b6a1f7b](https://github.com/knorm/knorm/commit/b6a1f7b))
* **Knorm:** no need for a new Transation per instance ([0ba58aa](https://github.com/knorm/knorm/commit/0ba58aa))
* **Knorm:** show correct errors for reserved property names ([d89981a](https://github.com/knorm/knorm/commit/d89981a))
* **Model:** allow adding methods for non-unique fields ([191e202](https://github.com/knorm/knorm/commit/191e202))
* **Model:** allow unsetting primary field in a child model ([24e84dc](https://github.com/knorm/knorm/commit/24e84dc))
* **Model:** cast data after instance db operatons ([c8784d9](https://github.com/knorm/knorm/commit/c8784d9))
* **Model:** do not rely on Query returning the same instance ([ae89fda](https://github.com/knorm/knorm/commit/ae89fda))
* **Model:** remove unncessary function binding for virtuals ([3a2f79b](https://github.com/knorm/knorm/commit/3a2f79b))
* **package:** update knex peerDep versions ([dd5de39](https://github.com/knorm/knorm/commit/dd5de39))
* **package:** update validator to version 10.1.0 ([471e8b4](https://github.com/knorm/knorm/commit/471e8b4)), closes [#73](https://github.com/knorm/knorm/issues/73)
* **Query:** cast before validate ([dc6a851](https://github.com/knorm/knorm/commit/dc6a851)), closes [#fb394f3](https://github.com/knorm/knorm/issues/fb394f3)
* **Query:** cast values _after_ validating ([d222922](https://github.com/knorm/knorm/commit/d222922))
* **Query:** change default placeholder to `$` ([414fda0](https://github.com/knorm/knorm/commit/414fda0))
* **Query:** do not consider primary field for array updates ([b12be78](https://github.com/knorm/knorm/commit/b12be78))
* **Query:** do not include primary fields if not requested ([7c24a16](https://github.com/knorm/knorm/commit/7c24a16))
* **Query:** negate "where in []" queries ([88c006f](https://github.com/knorm/knorm/commit/88c006f))
* set `knorm` and `models` defaults ([6dfa402](https://github.com/knorm/knorm/commit/6dfa402))
* **Query:** fix handling of where expressions with array values ([25a4968](https://github.com/knorm/knorm/commit/25a4968))
* **Query:** getData -> getFieldData ([174561a](https://github.com/knorm/knorm/commit/174561a))
* **Query:** handle a "no `fields` option" edge case ([35d4d1d](https://github.com/knorm/knorm/commit/35d4d1d))
* **Query:** handle unknown directions in orderBy ([4b9cbbb](https://github.com/knorm/knorm/commit/4b9cbbb))
* **Query:** handle update/insert with empty data ([355e49b](https://github.com/knorm/knorm/commit/355e49b))
* **Query:** quote columns for insert and update ([1921975](https://github.com/knorm/knorm/commit/1921975))
* **Query:** support non-fields in where/having clauses ([b249aa8](https://github.com/knorm/knorm/commit/b249aa8))
* **Query:** update single row when primary field is set ([9d88237](https://github.com/knorm/knorm/commit/9d88237))
* **Where:** ensure aliases are not overwritten ([5071e7d](https://github.com/knorm/knorm/commit/5071e7d))
* **WithKnex:** throw KnormError instances ([13603b0](https://github.com/knorm/knorm/commit/13603b0))

### Code Refactoring

* **Field:** drop 'json' from jsonObject and jsonArray ([cccaab0](https://github.com/knorm/knorm/commit/cccaab0))
* **Field:** Field.types.uuidV4 => Field.types.uuid4 ([cdeb2aa](https://github.com/knorm/knorm/commit/cdeb2aa))
* **Model:** refactor configs into Model.config ([6cd3d4e](https://github.com/knorm/knorm/commit/6cd3d4e))
* **Model:** remove debug-specific checks ([4510e94](https://github.com/knorm/knorm/commit/4510e94))
* **Model:** remove unnecessary static getters ([81d433c](https://github.com/knorm/knorm/commit/81d433c))
* **Query:** add query errors as statics ([6623e90](https://github.com/knorm/knorm/commit/6623e90))
* **Query:** complete rewrite ([28f461c](https://github.com/knorm/knorm/commit/28f461c))
* remove base classes from exports ([9b7fb87](https://github.com/knorm/knorm/commit/9b7fb87))
* **Query:** remove Query.prototype.count ([fd4d131](https://github.com/knorm/knorm/commit/fd4d131))
* **Query:** remove relations-related code ([3fe4408](https://github.com/knorm/knorm/commit/3fe4408))
* **Query:** swap knex with sql-bricks ([53ffe28](https://github.com/knorm/knorm/commit/53ffe28))
* **Virtual:** remove `hasGetter` and `hasSetter` ([734c734](https://github.com/knorm/knorm/commit/734c734))

### Features

* **Field:** support the `fieldName: fieldType` config shorthand ([cba1504](https://github.com/knorm/knorm/commit/cba1504))
* **Knorm:** add `addModel` ([97b66d1](https://github.com/knorm/knorm/commit/97b66d1))
* **Knorm:** add `clone` ([b894409](https://github.com/knorm/knorm/commit/b894409))
* **Knorm:** add accessors to models ([7ea0938](https://github.com/knorm/knorm/commit/7ea0938))
* **Knorm:** link scoped classes to the Knorm instance ([29ff34d](https://github.com/knorm/knorm/commit/29ff34d))
* **Knorm:** store plugins added by name ([e7f2a1d](https://github.com/knorm/knorm/commit/e7f2a1d))
* **Model:** add `getField` ([5e4d5b0](https://github.com/knorm/knorm/commit/5e4d5b0))
* **Model:** add `getVirtualData` ([9b23c6f](https://github.com/knorm/knorm/commit/9b23c6f))
* **Model:** add `getVirtualDataSync` and `getDataSync` ([5da6c6f](https://github.com/knorm/knorm/commit/5da6c6f))
* **Model:** add `Model.removeField` ([ee10c65](https://github.com/knorm/knorm/commit/ee10c65))
* **Model:** add `Model.where` ([8f3dbcb](https://github.com/knorm/knorm/commit/8f3dbcb))
* **Model:** add models to the knorm instance ([52c9b57](https://github.com/knorm/knorm/commit/52c9b57))
* **Model:** expose `getFieldData` ([a8e0ec1](https://github.com/knorm/knorm/commit/a8e0ec1))
* **Query:** add `Query.where` getter ([0d6595f](https://github.com/knorm/knorm/commit/0d6595f))
* **Query:** add debug mode with better stack traces ([3fdf2e5](https://github.com/knorm/knorm/commit/3fdf2e5))
* **Query:** support `between` expressions with an array value ([0f5f403](https://github.com/knorm/knorm/commit/0f5f403))
* **Query:** support `in` queries with an empty array ([4982fdc](https://github.com/knorm/knorm/commit/4982fdc))
* **Query:** support objects for where expressions ([b1b826d](https://github.com/knorm/knorm/commit/b1b826d))
* **Transaction:** add transaction-scoped classes ([173e283](https://github.com/knorm/knorm/commit/173e283))
* **Transaction:** add TransactionError ([224033a](https://github.com/knorm/knorm/commit/224033a))

### Performance Improvements

* **KnormError:** do not format formatted messages ([59e2796](https://github.com/knorm/knorm/commit/59e2796))
* **Model:** inherit model configs when setting configs ([7bb98b9](https://github.com/knorm/knorm/commit/7bb98b9))
* **Query:** concat insert/update batches async ([6139b8f](https://github.com/knorm/knorm/commit/6139b8f))
* **Query:** only cast data returned from the database ([2be52e3](https://github.com/knorm/knorm/commit/2be52e3))

### BREAKING CHANGES

**Knorm:**

* no more `knex` option. not needed since knorm now delegates
  db connection-handling to plugins
* `const { Model } = require('@knorm/knorm')` does not work anymore. base
  classes can be accessed via a Knorm instance or as Knorm statics
* plugins are now required to have a `name` property

**Model:**

* refactored:

  * `Model.setFields` => `Model.config.fields` / `Model.fields` setter
  * `Model.getFields` => `Model.config.fields` / `Model.fields` getter
  * `Model.setVirtuals` => `Model.config.virtuals` / `Model.virtuals` setter
  * `Model.getVirtuals` => `Model.config.virtuals` / `Model.virtuals` getter
  * `Model.setVirtuals` => `Model.config.virtuals` / `Model.virtuals` setter
  * `Model.getPrimary` => `Model.config.primary` / `Model.primary` getter
  * `Model.getUnique` => `Model.config.unique` / `Model.unique` setter
  * `Model.getReferences` => `Model.config.references` / `Model.references` getter
  * `Model.getNotUpdated` => `Model.config.notUpdated` / `Model.notUpdated` getter

* refactored:

  * `Model.primary` => `Model.config.primary`
  * `Model.notUpdated` => `Model.config.notUpdated`
  * `Model.unique` => `Model.config.unique`

* removed checks:

  * Removed check for unknown keys in `setData`
  * Removed check for unknown fields for all methods that accept a `fields` option
    e.g. `validate`, `getData`, `getDataSync`, `getFieldData`, `getVirtualData`,
    `getVirtualDataSync`, `cast` and `setDefaults`
  * Removed check for virtuals having a setter in `setData`. Now a JS `TypeError`
    is thrown instead

**Field:**

* renamed field types:

  * `jsonObject` => `object`
  * `jsonArray` => `array`
  * `uuidV4` => `uuid4`

**Virtual:**

* removed `hasGetter` and `hasSetter` instead, use `!!virtual.get` or `!!virtual.set`

**Query:**

* swap knex with sql-bricks. this change means that knorm only
  generates SQL and leaves query-running (connections, pooling,
  transations) to db-specific plugins
* removed support for Oracle and MSSQL which was not properly
  tested anyway
* support for relations moved to @knorm/relations:
  https://github.com/knorm/relations
* removed Query.prototype.count, moved to @knorm/paginate:
  https://github.com/knorm/paginate
* fixed the `lean` (or `forge: false` option) option to not cast values. This
  option now works as it should, completely bypassing creation of Model
  instances (which includes casting values)
* inverted specifying of field aliases for `fields` and `.returning` to match
  knex's query builder: `.fields({ field: 'alias' })`
  to `.fields({ alias: 'field' })`
* removed `Query.errors` and added them directly to `Query`
* all `where*` e.g. `whereIn` are removed and replaced with
  expressions e.g. `where(where.in(field, values))`
* `insert` does not resolve with the same instances that were
  passed. we cannot guarantee that all instances passed in
  will be returned from the insert
* `update` does not resolve with the same instances that were
  passed
* fix: joined models are always returned as an array unless
  `first` is configured on the joined query
* removed checks:

  * removed `Query.errors`. Errors are now exported directly as `Query` statics
    e.g. `Query.QueryError`, `Query.FetchError`
  * removed support for `fields` with Field instances:
    `.fetch({ fields: Model.fields })`, `.fields(Model.fields)`
  * removed support for `returning` with Field instances:
    `.insert({ foo: 'bar' }, { returning: Model.fields })`,
    `.returning(Model.fields)`
  * removed validation of fields for all Query methods:
    `.fetch({ where: { unknownField: 'foo' } })` will throw
  * removed casting of aliased fields: if a field has a post-fetch cast function
    it won't be cast of the field is aliased in a fetch
  * removed support for `.where({ field: [] })` to mean "where field in array".
    `where` is now just a proxy to knex's query builder's `where`
  * removed support for `having` with object values i.e. `.having({ id: 1 })`.
    `having` is now just a proxy to knex's query builder's `having`
  * removed the `within` alias for `transaction`
  * removed the check against doing a fetch on a joined query
  * removed support for the `on` option with Field instances:
    `.on(Model.fields.id)`
  * removed support for the `field` option with Field instances:
    `.field(Model.fields.id)`
  * removed support for `distinct` with field instances:
    `.distinct(Model.fields.id)`
  * removed check against `insert` and `update` with non-object values
  * removed check against `insert` and `update` with instances of a different
    model

<a name="0.11.1"></a>

## [0.11.1](https://github.com/joelmukuthu/knorm/compare/v0.11.0...v0.11.1) (2018-05-02)

### Bug Fixes

* **Field:** JSON.parse and validate json fields ([fc338d6](https://github.com/joelmukuthu/knorm/commit/fc338d6))
* **Query:** cast before validating on insert ([0030442](https://github.com/joelmukuthu/knorm/commit/0030442))

<a name="0.11.0"></a>

# [0.11.0](https://github.com/joelmukuthu/knorm/compare/v0.10.1...v0.11.0) (2017-12-29)

### Code Refactoring

* **Model:** remove `ByPrimaryField` methods ([d52389c](https://github.com/joelmukuthu/knorm/commit/d52389c))

### Features

* **Model:** add support for `ByField` methods ([9882d41](https://github.com/joelmukuthu/knorm/commit/9882d41))

### BREAKING CHANGES

* **Model:** instead of fetchByPrimaryField etc, use:

```js
Model.fields = {
  id: {
    primary: true,
    methods: true
  }
};
```

to have these methods automatically added:

```js
Model.fetchById;
Model.updateById;
Model.deleteById;
```

<a name="0.10.1"></a>

## [0.10.1](https://github.com/joelmukuthu/knorm/compare/v0.10.0...v0.10.1) (2017-12-28)

### Features

* **Knorm:** support plugins as functions ([851716e](https://github.com/joelmukuthu/knorm/commit/851716e))

<a name="0.10.0"></a>

# [0.10.0](https://github.com/joelmukuthu/knorm/compare/v0.9.3...v0.10.0) (2017-12-23)

### Bug Fixes

* **Field:** do not share cast functions across clones ([626e653](https://github.com/joelmukuthu/knorm/commit/626e653))
* **KnormError:** support error messages ([c785150](https://github.com/joelmukuthu/knorm/commit/c785150))
* **Model:** fix inheritance ([f1b8a1c](https://github.com/joelmukuthu/knorm/commit/f1b8a1c))

### Code Refactoring

* **Field:** remove updateModel() in favour of clone() ([2320384](https://github.com/joelmukuthu/knorm/commit/2320384))
* **Model:** remove `ById` methods ([ddd8376](https://github.com/joelmukuthu/knorm/commit/ddd8376))
* **Model:** remove `fieldNames` ([40c8edd](https://github.com/joelmukuthu/knorm/commit/40c8edd))
* **Model:** simplify config inheritance ([3a98135](https://github.com/joelmukuthu/knorm/commit/3a98135))

### Features

* **Knorm:** add Knorm helper class ([fab70eb](https://github.com/joelmukuthu/knorm/commit/fab70eb))
* **Model:** add `getQuery` ([cd4141a](https://github.com/joelmukuthu/knorm/commit/cd4141a))
* **Model:** add support for "not-updated" fields ([97a1eb4](https://github.com/joelmukuthu/knorm/commit/97a1eb4))
* **Model:** add support for `primary` fields ([a3a8d0d](https://github.com/joelmukuthu/knorm/commit/a3a8d0d))
* **Model:** add support for unique fields ([a1bec79](https://github.com/joelmukuthu/knorm/commit/a1bec79))
* add support for plugins ([cf19074](https://github.com/joelmukuthu/knorm/commit/cf19074))

### BREAKING CHANGES

* **Model:** removed `Field.prototype.clone` and `Virtual.prototype.clone`
* **Model:** previously, the primary field was assumed to be
  one of the fields that should not be updated by `Query.prototype.update`, now it
  has to be specified:

```js
Model.fields = {
  id: { type: 'integer', primary: true, updated: false }
};
```

* **Model:** ```js
  Model.fetchById => Model.fetchByPrimaryField
  Model.updateById => Model.updateByPrimaryField
  Model.deleteById => Model.deleteByPrimaryField

````
* **Model:** instead of using the `fieldNames` config to define
the primary field, use the `primary` Field config:

```js
Model.fields = {
  id: { type: 'integer', primary: true }
};
````

<a name="0.9.3"></a>

## [0.9.3](https://github.com/joelmukuthu/knorm/compare/v0.9.2...v0.9.3) (2017-11-23)

### Bug Fixes

* **Field:** allow `equals` validation with a zero value ([7ec3a7a](https://github.com/joelmukuthu/knorm/commit/7ec3a7a))
* **Field:** allow `maxLength` validation with value zero ([45846e0](https://github.com/joelmukuthu/knorm/commit/45846e0))
* **Query:** add joins before all other options ([cd1ccdd](https://github.com/joelmukuthu/knorm/commit/cd1ccdd))

### Features

* **Query:** add whereRaw ([fc7efc9](https://github.com/joelmukuthu/knorm/commit/fc7efc9))

<a name="0.9.2"></a>

## [0.9.2](https://github.com/joelmukuthu/knorm/compare/v0.9.1...v0.9.2) (2017-11-16)

### Bug Fixes

* fix regex validation error messages ([fdab926](https://github.com/joelmukuthu/knorm/commit/fdab926))

<a name="0.9.1"></a>

## [0.9.1](https://github.com/joelmukuthu/knorm/compare/v0.9.0...v0.9.1) (2017-11-01)

### Bug Fixes

* **Transaction:** fix Promise interface ([6c44faf](https://github.com/joelmukuthu/knorm/commit/6c44faf))

<a name="0.9.0"></a>

# [0.9.0](https://github.com/joelmukuthu/knorm/compare/v0.8.1...v0.9.0) (2017-11-01)

### Bug Fixes

* **Field:** call custom validators if the value is `null` ([4c977a2](https://github.com/joelmukuthu/knorm/commit/4c977a2))
* **Field:** do not share `any` and `date` validators ([28a6c09](https://github.com/joelmukuthu/knorm/commit/28a6c09))
* **Field:** fix JSON validation ([890fca2](https://github.com/joelmukuthu/knorm/commit/890fca2))
* **Field:** make validateTypeWith private ([469ce0e](https://github.com/joelmukuthu/knorm/commit/469ce0e))
* **Field:** match error messages with config options ([4766cb1](https://github.com/joelmukuthu/knorm/commit/4766cb1))
* **Field:** stop sharing validators ([3df91e4](https://github.com/joelmukuthu/knorm/commit/3df91e4))
* **Model:** cast should not be async ([9ace467](https://github.com/joelmukuthu/knorm/commit/9ace467))
* **Query:** always return arrays from query methods ([33b882c](https://github.com/joelmukuthu/knorm/commit/33b882c))
* **Query:** return an array from Query.prototype.insert ([34f243e](https://github.com/joelmukuthu/knorm/commit/34f243e))
* **QueryError:** fix errorneous truncating of some knex errors ([779b1a9](https://github.com/joelmukuthu/knorm/commit/779b1a9))

### Features

* **Model:** validate field and virtual names ([bcbde2c](https://github.com/joelmukuthu/knorm/commit/bcbde2c))

<a name="0.8.1"></a>

## [0.8.1](https://github.com/joelmukuthu/knorm/compare/v0.8.0...v0.8.1) (2017-10-06)

### Features

* **Query:** support returning the first updated/deleted model ([8f94c73](https://github.com/joelmukuthu/knorm/commit/8f94c73))

<a name="0.8.0"></a>

# [0.8.0](https://github.com/joelmukuthu/knorm/compare/v0.7.3...v0.8.0) (2017-10-05)

### Code Refactoring

* **Query:** do not special-case instances with an id ([e82173d](https://github.com/joelmukuthu/knorm/commit/e82173d))

### Features

* **Model:** ensure id is set for db operations on instances ([5c8163a](https://github.com/joelmukuthu/knorm/commit/5c8163a))

### BREAKING CHANGES

* **Query:** to conform with other Query methods, update now
  always resolves with an array. If passed an instance with an id,
  it no longer adds the "where id" clause, this has instead moved
  to Model.prototype.update (similar to Model.prototype.fetch and
  Model.prototype.delete)

<a name="0.7.3"></a>

## [0.7.3](https://github.com/joelmukuthu/knorm/compare/v0.7.2...v0.7.3) (2017-10-04)

### Bug Fixes

* **Model:** always pass the id for instance db operations ([2b2fede](https://github.com/joelmukuthu/knorm/commit/2b2fede))
* **package:** update validator to version 9.0.0 ([57354f7](https://github.com/joelmukuthu/knorm/commit/57354f7))

<a name="0.7.2"></a>

## [0.7.2](https://github.com/joelmukuthu/knorm/compare/v0.7.1...v0.7.2) (2017-09-05)

### Bug Fixes

* **Field:** add validator methods per type ([aa52e26](https://github.com/joelmukuthu/knorm/commit/aa52e26))
* **Field:** avoid schema validation for json strings ([7a68ae8](https://github.com/joelmukuthu/knorm/commit/7a68ae8))
* **Field:** do not validate json(b) types ([86b9479](https://github.com/joelmukuthu/knorm/commit/86b9479))
* **Query:** do not throw require errors for innerJoins ([9a58d4d](https://github.com/joelmukuthu/knorm/commit/9a58d4d))

### Features

* **Field:** add 'number' type ([776498e](https://github.com/joelmukuthu/knorm/commit/776498e))
* **Field:** add support for 'regex' validators ([893aca8](https://github.com/joelmukuthu/knorm/commit/893aca8))
* **Query:** add 'lean' option ([237a627](https://github.com/joelmukuthu/knorm/commit/237a627))

<a name="0.7.1"></a>

## [0.7.1](https://github.com/joelmukuthu/knorm/compare/v0.7.0...v0.7.1) (2017-08-30)

### Bug Fixes

* **Field:** allow null values for json schema validators ([64fc7f0](https://github.com/joelmukuthu/knorm/commit/64fc7f0))

<a name="0.7.0"></a>

# [0.7.0](https://github.com/joelmukuthu/knorm/compare/v0.6.2...v0.7.0) (2017-08-30)

### Bug Fixes

* **Field:** fix error message path for json-array fields ([6a382a4](https://github.com/joelmukuthu/knorm/commit/6a382a4))
* **Field:** fix error messages for schema fields ([ca99958](https://github.com/joelmukuthu/knorm/commit/ca99958))
* **Query:** cast models after validation ([a51d33f](https://github.com/joelmukuthu/knorm/commit/a51d33f))

### Code Refactoring

* **Field:** name cast functions explicitly ([2e192e1](https://github.com/joelmukuthu/knorm/commit/2e192e1))
* **Field:** setModel => updateModel ([b4f0833](https://github.com/joelmukuthu/knorm/commit/b4f0833))

### Features

* support json schema validation ([46dfd72](https://github.com/joelmukuthu/knorm/commit/46dfd72))
* **Field:** add support for 'any' field types ([af4cde4](https://github.com/joelmukuthu/knorm/commit/af4cde4))
* **Field:** add support for date types ([6b2adf7](https://github.com/joelmukuthu/knorm/commit/6b2adf7))
* **Field:** add support for email types ([cec2115](https://github.com/joelmukuthu/knorm/commit/cec2115))
* **Field:** support 'equals' validator ([7c184e8](https://github.com/joelmukuthu/knorm/commit/7c184e8))
* **Field:** support jsonb field types ([456cc35](https://github.com/joelmukuthu/knorm/commit/456cc35))
* **Model:** add Model.count ([598ee98](https://github.com/joelmukuthu/knorm/commit/598ee98))
* **Query:** add support for SELECT DISTINCT ([1b1d358](https://github.com/joelmukuthu/knorm/commit/1b1d358))
* **Query:** support options for count() ([c251415](https://github.com/joelmukuthu/knorm/commit/c251415))

### BREAKING CHANGES

* **Query:** before, Query was casting models before validation,
  which meant that the value passed to custom validators would already
  be cast. this change might require custom validators to be updated.
* **Field:** refactored:

- Field.prototype.setModel to Field.prototype.updateModel
- Virtual.prototype.setModel to Virtual.prototype.updateModel

removed Field.prototype.setReference

* **Field:** field cast options changed from:

```js
Model.fields = {
  foo: {
    cast: {
      save() {},
      fetch() {}
    }
  }
};
```

to:

```js
Model.fields = {
  foo: {
    cast: {
      forSave() {},
      forFetch() {}
    }
  }
};
```

<a name="0.6.2"></a>

## [0.6.2](https://github.com/joelmukuthu/knorm/compare/v0.6.1...v0.6.2) (2017-08-18)

### Features

* **Query:** support batch inserts ([03ad68a](https://github.com/joelmukuthu/knorm/commit/03ad68a))
* **Query:** support passing options to CRUD methods ([9821f0c](https://github.com/joelmukuthu/knorm/commit/9821f0c))

<a name="0.6.1"></a>

## [0.6.1](https://github.com/joelmukuthu/knorm/compare/v0.6.0...v0.6.1) (2017-08-16)

### Features

* **Field:** add throwValidationError ([c234b33](https://github.com/joelmukuthu/knorm/commit/c234b33))
* **Model:** expose getField and getFields ([7bdc10e](https://github.com/joelmukuthu/knorm/commit/7bdc10e))

<a name="0.6.0"></a>

# [0.6.0](https://github.com/joelmukuthu/knorm/compare/v0.5.0...v0.6.0) (2017-08-11)

* feat(field) support customizing validation errors ([4d6dcca](https://github.com/joelmukuthu/knorm/commit/4d6dcca))

### Bug Fixes

* **Query:** fix formatting of query error messages ([9bb85de](https://github.com/joelmukuthu/knorm/commit/9bb85de))

### Code Refactoring

* standardize options ([dd73690](https://github.com/joelmukuthu/knorm/commit/dd73690))

### BREAKING CHANGES

* **Query:** QueryError arguments have changed and KnormError
  does not auto-format messages anymore due to:
  * removed Field.errors in place of only Field.ValidationError
  * changed ValidationError arguments
* Field.prototype.cast/Model.prototype.cast options are changed:
  * options.save => options.forSave
  * options.fetch => options.forFetch

<a name="0.5.0"></a>

# [0.5.0](https://github.com/joelmukuthu/knorm/compare/v0.4.2...v0.5.0) (2017-08-08)

### Features

* **Field:** allow overriding the cast method ([c3f86a5](https://github.com/joelmukuthu/knorm/commit/c3f86a5))

### BREAKING CHANGES

* **Field:** Field.prototype.hasCast refactored to Field.prototype.\_hasCast

<a name="0.4.2"></a>

## [0.4.2](https://github.com/joelmukuthu/knorm/compare/v0.4.1...v0.4.2) (2017-08-08)

### Features

* support inserting arrays of data ([da75f1e](https://github.com/joelmukuthu/knorm/commit/da75f1e))

<a name="0.4.1"></a>

## [0.4.1](https://github.com/joelmukuthu/knorm/compare/v0.4.0...v0.4.1) (2017-08-04)

### Bug Fixes

* **Model:** only use the id for where clauses ([a26e42e](https://github.com/joelmukuthu/knorm/commit/a26e42e))

### Features

* **Query:** support updating multiple rows ([17f2ac5](https://github.com/joelmukuthu/knorm/commit/17f2ac5))

<a name="0.4.0"></a>

# [0.4.0](https://github.com/joelmukuthu/knorm/compare/v0.3.0...v0.4.0) (2017-08-03)

### Bug Fixes

* **column:** copy column name when cloning field instances ([bfa01ec](https://github.com/joelmukuthu/knorm/commit/bfa01ec))

### Code Refactoring

* Model.idField => Model.fieldNames.id ([45ade15](https://github.com/joelmukuthu/knorm/commit/45ade15))
* remove timestamps functionality ([a8192ee](https://github.com/joelmukuthu/knorm/commit/a8192ee))

### Features

* **Model:** add Model.fieldNames ([9e22776](https://github.com/joelmukuthu/knorm/commit/9e22776))

### BREAKING CHANGES

* timestamps are now moved to knorm-timestamps plugin
* Model.idField => Model.fieldNames.id

<a name="0.3.0"></a>

# [0.3.0](https://github.com/joelmukuthu/knorm/compare/v0.2.4...v0.3.0) (2017-07-28)

### Code Refactoring

* **Query:** join/with -> leftJoin/innerJoin/join ([0a679c2](https://github.com/joelmukuthu/knorm/commit/0a679c2))

### BREAKING CHANGES

* **Query:** removed Query.prototype.with and changed Query.prototype.join
  to do an inner join query

<a name="0.2.4"></a>

## [0.2.4](https://github.com/joelmukuthu/knorm/compare/v0.2.3...v0.2.4) (2017-07-28)

### Bug Fixes

* **Query:** fix field aliases ([b0badb8](https://github.com/joelmukuthu/knorm/commit/b0badb8))

<a name="0.2.3"></a>

## [0.2.3](https://github.com/joelmukuthu/knorm/compare/v0.2.2...v0.2.3) (2017-07-27)

### Bug Fixes

* **Model:** fix cloning of virtuals ([209923f](https://github.com/joelmukuthu/knorm/commit/209923f))

<a name="0.2.2"></a>

## [0.2.2](https://github.com/joelmukuthu/knorm/compare/v0.2.1...v0.2.2) (2017-07-27)

### Bug Fixes

* **Query:** use the table name in joined queries ([3636d41](https://github.com/joelmukuthu/knorm/commit/3636d41))

### Features

* **Query:** support 'raw' and 'column' where/having options ([b60ec1b](https://github.com/joelmukuthu/knorm/commit/b60ec1b))

<a name="0.2.1"></a>

## [0.2.1](https://github.com/joelmukuthu/knorm/compare/v0.2.0...v0.2.1) (2017-07-26)

### Bug Fixes

* **Field:** copy cast functions when cloning ([8b997ed](https://github.com/joelmukuthu/knorm/commit/8b997ed))
* **Field:** fix validation of JSON strings ([b41e3ef](https://github.com/joelmukuthu/knorm/commit/b41e3ef))
* **Query:** disallow 'options' as an option ([3bdafcb](https://github.com/joelmukuthu/knorm/commit/3bdafcb))

### Features

* **Query:** add support for `require` with count() ([8ed78cf](https://github.com/joelmukuthu/knorm/commit/8ed78cf))
* add casting of field values ([562dfd4](https://github.com/joelmukuthu/knorm/commit/562dfd4))

<a name="0.2.0"></a>

# [0.2.0](https://github.com/joelmukuthu/knorm/compare/v0.1.0...v0.2.0) (2017-07-21)

### Bug Fixes

* remove code duplicated by mistake ([69cef5b](https://github.com/joelmukuthu/knorm/commit/69cef5b))

### Features

* add KnormError ([f92722c](https://github.com/joelmukuthu/knorm/commit/f92722c))
* export custom error classes ([026c6a5](https://github.com/joelmukuthu/knorm/commit/026c6a5))

<a name="0.1.0"></a>

# [0.1.0](https://github.com/joelmukuthu/knorm/compare/v0.0.2...v0.1.0) (2017-06-05)

### Bug Fixes

* **Field:** do not snake-case column names by default ([ae1d067](https://github.com/joelmukuthu/knorm/commit/ae1d067))
* **Query:** handle null responses from the database ([84b5566](https://github.com/joelmukuthu/knorm/commit/84b5566))
* **Query:** set default values for flags ([c1fe03a](https://github.com/joelmukuthu/knorm/commit/c1fe03a))

### Features

* **Model:** add db methods ([c34f9f7](https://github.com/joelmukuthu/knorm/commit/c34f9f7))
* **Model:** add delete methods ([74918a4](https://github.com/joelmukuthu/knorm/commit/74918a4))
* **Query:** add Query.prototype.delete ([8caed15](https://github.com/joelmukuthu/knorm/commit/8caed15))
* **Query:** add Query.prototype.save ([b80a695](https://github.com/joelmukuthu/knorm/commit/b80a695))
* **Query:** alias Query.prototype.transaction as 'within' ([496771f](https://github.com/joelmukuthu/knorm/commit/496771f))
* **Query:** alias Query.prototype.with as 'join' ([5afc820](https://github.com/joelmukuthu/knorm/commit/5afc820))
* **Query:** update by id if the id is set ([011d222](https://github.com/joelmukuthu/knorm/commit/011d222))

<a name="0.0.2"></a>

## 0.0.2 (2017-03-20)
