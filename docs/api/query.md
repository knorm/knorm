# Query.prototype.having

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
