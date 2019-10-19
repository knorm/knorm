const Sql = require('../Sql');

class Default extends Sql {
  formatValue() {
    return '';
  }

  formatText() {
    return 'DEFAULT';
  }
}

module.exports = Default;
