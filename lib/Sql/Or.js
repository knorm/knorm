const Sql = require('../Sql');

class Or extends Sql {
  getText() {
    const values = this.value.map(value => this.formatExpression(value));

    if (values.length === 1) {
      return values;
    }

    return `(${values.join(' OR ')})`;
  }
}

module.exports = Or;
