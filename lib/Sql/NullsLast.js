const Sql = require('../Sql');

class NullsLast extends Sql {
  formatValue() {
    return '';
  }

  formatText() {
    return 'NULLS LAST';
  }
}

module.exports = NullsLast;
