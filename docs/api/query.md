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

## Query.prototype.query(sql) : Promise => []

## Query.prototype.sql

## Query.prototype.setOptions(options) : Query

## Query.prototype.debug([debug]) : Query

## Query.prototype.field(field) : Query

## Query.prototype.distinct(fields) : Query

## Query.prototype.fields(fields) : Query

## Query.prototype.returning(fields) : Query

## Query.prototype.groupBy(fields) : Query

## Query.prototype.orderBy(fields) : Query

## Query.prototype.leftJoin(queries, [options]) : Query

## Query.prototype.innerJoin(queries, [options]) : Query

> alias: Query.prototype.join(queries, [options])

## Query.prototype.on(field) : Query

## Query.prototype.as(alias) : Query

## Query.prototype.where(where) : Query

## Query.prototype.having(fields) : Query

## Query.prototype.limit(limit) : Query

## Query.prototype.offset(offset) : Query

## Query.prototype.batchSize(batchSize) : Query

## Query.prototype.first([first]) : Query

## Query.prototype.forge([forge]) : Query

## Query.prototype.lean([lean]) : Query

## Query.prototype.require([require]) : Query
