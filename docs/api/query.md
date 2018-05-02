## Query.knex

## Query.QueryError

## Query.CountError

## Query.FetchError

## Query.InsertError

## Query.UpdateError

## Query.DeleteError

## Query.NoRowsCountedError

## Query.NoRowsFetchedError

## Query.NoRowsInsertedError

## Query.NoRowsUpdatedError

## Query.NoRowsDeletedError

## Query(model)

## Query.prototype.count([options]) : Promise => Number

## Query.prototype.fetch([options]) : Promise => [Model]

## Query.prototype.save(data, [options]) : Promise => [Model]

## Query.prototype.insert(data, [options]) : Promise => [Model]

## Query.prototype.update(data, [options]) : Promise => [Model]

## Query.prototype.delete([options]) : Promise => [Model]

## Query.prototype.setOptions(options) : Query

## Query.prototype.field(field) : Query

## Query.prototype.distinct(field) : Query

## Query.prototype.fields(fields) : Query

## Query.prototype.returning(fields) : Query

## Query.prototype.groupBy(fields) : Query

## Query.prototype.orderBy(fields) : Query

## Query.prototype.leftJoin(queries, [options]) : Query

## Query.prototype.innerJoin(queries, [options]) : Query

> alias: Query.prototype.join(queries, [options])

## Query.prototype.on(field) : Query

## Query.prototype.as(alias) : Query

## Query.prototype.transaction(transaction, [options]) : Query

> alias: Query.prototype.within(transaction, [options])

## Query.prototype.where(fields) : Query

## Query.prototype.whereNot(fields) : Query

## Query.prototype.orWhere(fields) : Query

## Query.prototype.orWhereNot(fields) : Query

## Query.prototype.having(fields) : Query

Knex QueryBuilder's [having](http://knexjs.org/#Builder-having) method requires
an operator, therefore calls to `Query.prototype.having` must have an operator:

```js
new Query(User).having({
  id: {
    operator: '=',
    value: 1
  }
});
```

## Query.prototype.havingNot(fields) : Query

## Query.prototype.orHaving(fields) : Query

## Query.prototype.orHavingNot(fields) : Query

## Query.prototype.limit(limit) : Query

## Query.prototype.offset(offset) : Query

## Query.prototype.batchSize(batchSize) : Query

## Query.prototype.first([first]) : Query

## Query.prototype.forge([forge]) : Query

## Query.prototype.lean([lean]) : Query

## Query.prototype.require([require]) : Query
