const Sql = require('../Sql');

class NullsFirst extends Sql {
  getText() {
    return 'NULLS FIRST';
  }
}

module.exports = NullsFirst;
