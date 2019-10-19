const Sql = require('../Sql');

class Nowait extends Sql {
  formatValue() {
    return '';
  }

  formatText() {
    return 'NOWAIT';
  }
}

module.exports = Nowait;
