const Sql = require('../../../lib/Sql');

class Dummy extends Sql {
  formatValue() {
    return 'DUMMY';
  }
}

module.exports = Dummy;
