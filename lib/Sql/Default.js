const Sql = require('../Sql');

class Default extends Sql {
  formatValue() {
    return '';
  }

  getText() {
    return 'DEFAULT';
  }
}

module.exports = Default;
