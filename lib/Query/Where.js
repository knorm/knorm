class Where {
  raw(sql) {
    return new this.constructor.Raw(sql);
  }

  and(value) {
    return new this.constructor.Grouping({ type: 'and', value });
  }

  or(value) {
    return new this.constructor.Grouping({ type: 'or', value });
  }

  not(value) {
    return new this.constructor.Condition({ type: 'not', value });
  }

  any(value) {
    return new this.constructor.Condition({ type: 'any', value });
  }

  all(value) {
    return new this.constructor.Condition({ type: 'all', value });
  }

  exists(value) {
    return new this.constructor.Condition({ type: 'exists', value });
  }

  isNull(field) {
    return new this.constructor.Condition({ type: 'isNull', field });
  }

  isNotNull(field) {
    return new this.constructor.Condition({ type: 'isNotNull', field });
  }

  equalTo(field, value) {
    return new this.constructor.Condition({ type: 'equalTo', field, value });
  }

  notEqualTo(field, value) {
    return new this.constructor.Condition({ type: 'notEqualTo', field, value });
  }

  greaterThan(field, value) {
    return new this.constructor.Condition({
      type: 'greaterThan',
      field,
      value
    });
  }

  greaterThanOrEqualTo(field, value) {
    return new this.constructor.Condition({
      type: 'greaterThanOrEqualTo',
      field,
      value
    });
  }

  lessThan(field, value) {
    return new this.constructor.Condition({ type: 'lessThan', field, value });
  }

  lessThanOrEqualTo(field, value) {
    return new this.constructor.Condition({
      type: 'lessThanOrEqualTo',
      field,
      value
    });
  }

  like(field, value) {
    return new this.constructor.Condition({ type: 'like', field, value });
  }

  // TODO: postgres only
  // ilike(field, value) {
  //   return new this.constructor.Condition({ type: 'ilike', field, value });
  // }

  between(field, value) {
    return new this.constructor.Condition({ type: 'between', field, value });
  }

  in(field, value) {
    return new this.constructor.Condition({ type: 'in', field, value });
  }
}

module.exports = Where;

// TODO: Where.updateRaw
Where.Raw = require('./Sql/Raw');

// TODO: Where.updateGrouping

Where.Grouping = require('./Sql/Grouping');

// TODO: Where.updateCondition
Where.Condition = require('./Sql/Condition');
