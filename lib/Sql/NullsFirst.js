const Sql = require('../Sql');

class NullsFirst extends Sql {
  formatValue() {
    return '';
  }

  formatText() {
    return 'NULLS FIRST';
  }
}

module.exports = NullsFirst;
