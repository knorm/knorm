const Sql = require('../Sql');

class NullsLast extends Sql {
  getText() {
    return 'NULLS LAST';
  }
}

module.exports = NullsLast;
