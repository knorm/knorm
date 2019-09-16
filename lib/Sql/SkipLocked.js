const Sql = require('../Sql');

class SkipLocked extends Sql {
  getText() {
    return 'SKIP LOCKED';
  }
}

module.exports = SkipLocked;
