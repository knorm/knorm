const Sql = require('../Sql');

class Any extends Sql {
  getText() {
    return `ANY ${this.formatExpression(this.value)}`;
  }
}

module.exports = Any;
