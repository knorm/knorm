const Sql = require('../Sql');

class NullsFirst extends Sql {
  formatValue() {
    return '';
  }

  getText() {
    return 'NULLS FIRST';
  }
}

module.exports = NullsFirst;
