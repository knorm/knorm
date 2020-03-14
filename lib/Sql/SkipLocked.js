const Sql = require('../Sql');

class SkipLocked extends Sql {
  formatValue() {
    return '';
  }

  getText() {
    return 'SKIP LOCKED';
  }
}

module.exports = SkipLocked;
