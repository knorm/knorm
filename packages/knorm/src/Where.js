const isObject = value => typeof value === 'object' && value !== null;

// TODO: this adds support objects for where expressions i.e.
// `where.equal({ foo: 'bar' })`. this is only a work-around till it's
// supported in sql-bricks v3. otherwise addOption should just be
// `return { [`_$_${option}`]: args }`

class Where {
  _objectsToExpressions(option, args) {
    const expressions = [];

    args.forEach(arg => {
      if (
        option !== 'and' && // `and` already supports objects
        option !== 'not' && // `not` already supports objects
        option !== 'or' && // `or` already supports objects
        isObject(arg) &&
        !Array.isArray(arg) &&
        !(arg instanceof this.sql)
      ) {
        Object.entries(arg).forEach(([field, value]) => {
          if (!field.startsWith('_$_')) {
            expressions.push({ [`_$_${option}`]: [field, value] });
          }
        });
      }
    });

    return expressions;
  }

  addOption(option, args) {
    const expressions = this._objectsToExpressions(option, args);

    return expressions.length
      ? { _$_and: expressions }
      : { [`_$_${option}`]: args };
  }
}

const whereOptions = {
  and: 'and',
  or: 'or',
  not: 'not',
  equal: 'eq',
  notEqual: 'notEq',
  lessThan: 'lt',
  lessThanOrEqual: 'lte',
  greaterThan: 'gt',
  greaterThanOrEqual: 'gte',
  between: 'between',
  isNull: 'isNull',
  isNotNull: 'isNotNull',
  like: 'like',
  exists: 'exists',
  in: 'in',
  equalAll: 'eqAll',
  notEqualAll: 'notEqAll',
  lessThanAll: 'ltAll',
  lessThanOrEqualAll: 'lteAll',
  greaterThanAll: 'gtAll',
  greaterThanOrEqualAll: 'gteAll',
  equalAny: 'eqAny',
  notEqualAny: 'notEqAny',
  lessThanAny: 'ltAny',
  lessThanOrEqualAny: 'lteAny',
  greaterThanAny: 'gtAny',
  greaterThanOrEqualAny: 'gteAny',
  equalSome: 'eqSome',
  notEqualSome: 'notEqSome',
  lessThanSome: 'ltSome',
  lessThanOrEqualSome: 'lteSome',
  greaterThanSome: 'gtSome',
  greaterThanOrEqualSome: 'gteSome',
};

Object.entries(whereOptions).forEach(([option, alias]) => {
  if (!Where.prototype[option] && !Where.prototype[alias]) {
    Where.prototype[option] = function(...args) {
      return this.addOption(alias, args);
    };
    Where.prototype[alias] = Where.prototype[option];
  }
});

module.exports = Where;
