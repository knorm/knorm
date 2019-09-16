const Sql = require('../Sql');

class Nowait extends Sql {
  getText() {
    return 'NOWAIT';
  }
}

module.exports = Nowait;
