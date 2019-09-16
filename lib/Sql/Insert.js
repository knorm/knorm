const Sql = require('../Sql');

class Insert extends Sql {
  getText() {
    const parts = [];

    this.value.into && parts.push(this.value.into);
    this.value.columns && parts.push(this.value.columns);
    this.value.values && parts.push(this.value.values);
    this.value.returning && parts.push(this.value.returning);

    const insert = parts.map(part => this.formatExpression(part)).join(' ');

    return `INSERT ${insert}`;
  }
}

module.exports = Insert;
