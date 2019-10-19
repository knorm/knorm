const Sql = require('../Sql');

class Insert extends Sql {
  formatValue() {
    const parts = [];
    const value = this.getValue();

    value.into && parts.push(value.into);
    value.columns && parts.push(value.columns);
    value.values && parts.push(value.values);
    value.returning && parts.push(value.returning);

    return this.formatExpressions(parts, { glue: ' ' });
  }

  formatText() {
    return `INSERT ${this.formatValue()}`;
  }
}

module.exports = Insert;
