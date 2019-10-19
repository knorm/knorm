const Sql = require('../Sql');

class SkipLocked extends Sql {
  formatValue() {
    return '';
  }

  formatText() {
    return 'SKIP LOCKED';
  }
}

module.exports = SkipLocked;
