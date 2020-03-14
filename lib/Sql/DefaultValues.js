const Sql = require('../Sql');

class DefaultValues extends Sql {
  formatValue() {
    return '';
  }

  getText() {
    return 'DEFAULT VALUES';
  }
}

module.exports = DefaultValues;
