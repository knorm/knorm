const Sql = require('../Sql');

class DefaultValues extends Sql {
  formatValue() {
    return '';
  }

  formatText() {
    return 'DEFAULT VALUES';
  }
}

module.exports = DefaultValues;
