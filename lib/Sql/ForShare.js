const Sql = require('../Sql');

class ForShare extends Sql {
  getText() {
    const value = this.formatTrueOrOtherExpression(this.value);

    return value ? `FOR SHARE ${value}` : 'FOR SHARE';
  }
}

module.exports = ForShare;
