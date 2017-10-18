## Query.knex
## Query(model)
## Query.prototype.count([options]) : Promise => Number
## Query.prototype.fetch([options]) : Promise => [Model]
## Query.prototype.save(data, [options]) : Promise => [Model]
## Query.prototype.insert(data, [options]) : Promise => [Model]
## Query.prototype.update(data, [options]) : Promise => [Model]
## Query.prototype.delete([options]) : Promise => [Model]

## Query.prototype.setOptions(options) : Query

## Query.prototype.field(field)
## Query.prototype.distinct(field)
## Query.prototype.fields(fields)
## Query.prototype.returning(fields)

## Query.prototype.groupBy(fields)
## Query.prototype.orderBy(fields)

## Query.prototype.leftJoin(queries, [options])
## Query.prototype.innerJoin(queries, [options])
> alias: Query.prototype.join(queries, [options])
## Query.prototype.on(field)
## Query.prototype.as(alias)

## Query.prototype.transaction(transaction, [options])
> alias: Query.prototype.within(transaction, [options])

## Query.prototype.where(fields)
## Query.prototype.whereNot(fields)
## Query.prototype.orWhere(fields)
## Query.prototype.orWhereNot(fields)

## Query.prototype.having(fields)

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

## Query.prototype.havingNot(fields)
## Query.prototype.orHaving(fields)
## Query.prototype.orHavingNot(fields)

## Query.prototype.limit(limit)
## Query.prototype.offset(offset)
## Query.prototype.batchSize(batchSize)

## Query.prototype.first([first])
## Query.prototype.forge([forge])
## Query.prototype.lean([lean])
## Query.prototype.require([require])
