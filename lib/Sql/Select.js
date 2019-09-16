const Sql = require('../Sql');

class Select extends Sql {
  getText() {
    const parts = [];

    this.value.all && parts.push(this.value.all);
    this.value.distinct && parts.push(this.value.distinct);
    this.value.fields && parts.push(this.value.fields);
    this.value.from && parts.push(this.value.from);
    this.value.where && parts.push(this.value.where);
    this.value.groupBy && parts.push(this.value.groupBy);
    this.value.having && parts.push(this.value.having);
    this.value.orderBy && parts.push(this.value.orderBy);
    this.value.limit && parts.push(this.value.limit);
    this.value.offset && parts.push(this.value.offset);
    this.value.forUpdate && parts.push(this.value.forUpdate);
    this.value.forShare && parts.push(this.value.forShare);
    this.value.noWait && parts.push(this.value.noWait);
    this.value.skipLocked && parts.push(this.value.skipLocked);

    const select = parts.map(part => this.formatExpression(part)).join(' ');

    return `SELECT ${select}`;
  }
}

module.exports = Select;
