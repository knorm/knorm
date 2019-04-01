const { Grouping, Condition } = require('./Sql');

class Where {
  and(value) {
    return new Grouping({ type: 'and', value });
  }

  or(value) {
    return new Grouping({ type: 'or', value });
  }

  not(value) {
    return new Condition({ type: 'not', value });
  }

  any(value) {
    return new Condition({ type: 'any', value });
  }

  all(value) {
    return new Condition({ type: 'all', value });
  }

  exists(value) {
    return new Condition({ type: 'exists', value });
  }

  isNull(field) {
    return new Condition({ type: 'isNull', field });
  }

  isNotNull(field) {
    return new Condition({ type: 'isNotNull', field });
  }

  equalTo(field, value) {
    return new Condition({ type: 'equalTo', field, value });
  }

  notEqualTo(field, value) {
    return new Condition({ type: 'notEqualTo', field, value });
  }

  greaterThan(field, value) {
    return new Condition({ type: 'greaterThan', field, value });
  }

  greaterThanOrEqualTo(field, value) {
    return new Condition({ type: 'greaterThanOrEqualTo', field, value });
  }

  lessThan(field, value) {
    return new Condition({ type: 'lessThan', field, value });
  }

  lessThanOrEqualTo(field, value) {
    return new Condition({ type: 'lessThanOrEqualTo', field, value });
  }

  like(field, value) {
    return new Condition({ type: 'like', field, value });
  }

  ilike(field, value) {
    return new Condition({ type: 'ilike', field, value });
  }

  between(field, value) {
    return new Condition({ type: 'between', field, value });
  }

  in(field, value) {
    return new Condition({ type: 'in', field, value });
  }
}

Where.Condition = Condition;

module.exports = Where;
