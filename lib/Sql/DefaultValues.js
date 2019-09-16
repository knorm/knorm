const Sql = require('../Sql');

class DefaultValues extends Sql {
  getText() {
    return 'DEFAULT VALUES';
  }
}

module.exports = DefaultValues;
