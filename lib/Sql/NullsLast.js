const Sql = require('../Sql');

class NullsLast extends Sql {
  formatValue() {
    return '';
  }

  getText() {
    return 'NULLS LAST';
  }
}

module.exports = NullsLast;
