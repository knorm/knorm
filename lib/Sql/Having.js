const Sql = require('../Sql');

class Having extends Sql {
  getText() {
    return `HAVING ${this.formatConditionExpression(this.value)}`;
  }
}

module.exports = Having;
