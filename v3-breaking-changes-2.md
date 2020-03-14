refactor(Query): move Query options to QueryOptions

feat(Query): support unsetting query options by setting an option as `null`

BREAKING CHANGE: `Query.prototype.field`, `Query.prototype.fields` and
`Query.prototype.returning` are not unset by passing `null`, not `false`:
```js
// Instead of:
Model.fetch({ fields: false });
// Use:
Model.fetch({ fields: null });
```

BREAKING CHANGE: Calling `Query` options directly as methods is no longer
supported. Instead, pass `Query` options via object params or
`Query.prototype.setOption` or `Query.prototype.setOptions`:
```js
// Instead of:
Model.query.where({ firstName: 'Foo' }).fetch();
// Use:
Model.fetch({ where: { firstName: 'Foo' } });
// Or:
Model.query.setOption('where', { firstName: 'Foo' }).fetch();
// Or:
Model.query.setOptions({ where: { firstName: 'Foo' } }).fetch();
```

BREAKING CHANGE: Removed:
- `Query.prototype.addOption`
- `Query.prototype.appendOption`
- `Query.prototype.unsetOption`
- `Query.prototype.unsetOptions`

BREAKING CHANGE: Moved:
- `Query.prototype.debug` to `QueryOptions.prototype.debug`
- `Query.prototype.require` to `QueryOptions.prototype.require`
- `Query.prototype.batchSize` to `QueryOptions.prototype.batchSize`
- `Query.prototype.first to `QueryOptions.prototype.first`
- `Query.prototype.distinct` to `QueryOptions.prototype.distinct`
- `Query.prototype.fields` to `QueryOptions.prototype.fields`
- `Query.prototype.returning` to `QueryOptions.prototype.returning`
- `Query.prototype.field` to `QueryOptions.prototype.field`
- `Query.prototype.where` to `QueryOptions.prototype.where`
- `Query.prototype.having` to `QueryOptions.prototype.having`
- `Query.prototype.groupBy` to `QueryOptions.prototype.groupBy`
- `Query.prototype.orderBy` to `QueryOptions.prototype.orderBy`
- `Query.prototype.limit` to `QueryOptions.prototype.limit`
- `Query.prototype.offset` to `QueryOptions.prototype.offset`
- `Query.prototype.forUpdate` to `QueryOptions.prototype.forUpdate`
- `Query.prototype.of` to `QueryOptions.prototype.of`
- `Query.prototype.noWait` to `QueryOptions.prototype.noWait`

BREAKING CHANGE: `QueryOptions.prototype.distinct` no longer supports passing
fields. Instead, use a combination of `QueryOptions.prototype.distinct` and
`QueryOptions.prototype.fields` (or `QueryOptions.prototype.fields` or
`QueryOptions.prototype.returning`):
```js
// Instead of:
Model.fetch({ distinct: 'firstName' });
// Use:
Model.fetch({ distinct: true, field: 'firstName' });
```

BREAKING CHANGE: `QueryOptions.prototype.field`, `QueryOptions.prototype.fields`
and `QueryOptions.prototype.returning` no longer support passing varargs.
Instead, multiple fields should be passed as an array:
```js
Model.fetch({ fields: ['firstName', 'lastName'] });
```

BREAKING CHANGE: `QueryOptions.prototype.where`,
`QueryOptions.prototype.having`, `QueryOptions.prototype.groupBy`,
`QueryOptions.prototype.orderBy`, `QueryOptions.prototype.of` no longer support
passing varargs. Instead, multiple `WHERE`, `HAVING`, `GROUP BY`, `ORDER BY`,
`OF` clauses should be passed as an array:
```js
Model.fetch({ where: [{ firstName: 'Foo' }, { lastName: 'Bar' }] });
// though this particular example would be better written as:
Model.fetch({ where: { firstName: 'Foo', lastName: 'Bar' } });
```
