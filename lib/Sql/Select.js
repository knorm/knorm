const Sql = require('../Sql');

class Select extends Sql {
  formatValue() {
    const parts = [];
    const value = this.getValue();

    value.all && parts.push(value.all);
    value.distinct && parts.push(value.distinct);
    value.fields && parts.push(value.fields);
    value.from && parts.push(value.from);
    value.where && parts.push(value.where);
    value.groupBy && parts.push(value.groupBy);
    value.having && parts.push(value.having);
    value.orderBy && parts.push(value.orderBy);
    value.limit && parts.push(value.limit);
    value.offset && parts.push(value.offset);
    value.forUpdate && parts.push(value.forUpdate);
    value.forShare && parts.push(value.forShare);
    value.noWait && parts.push(value.noWait);
    value.skipLocked && parts.push(value.skipLocked);

    return this.formatExpressions(parts, { glue: ' ' });
  }

  getText() {
    return `SELECT ${this.formatValue()}`;
  }
}

module.exports = Select;
