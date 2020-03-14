const Sql = require('../Sql');

class Nowait extends Sql {
  formatValue() {
    return '';
  }

  getText() {
    return 'NOWAIT';
  }
}

module.exports = Nowait;
