const Sql = require('../Sql');

class Exists extends Sql {
  getText() {
    return `EXISTS ${this.formatExpression(this.value)}`;
  }
}

module.exports = Exists;
