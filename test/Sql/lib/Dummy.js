const Sql = require('../../../lib/Sql');

class Dummy extends Sql {
  getText() {
    return 'DUMMY';
  }
}

module.exports = Dummy;
