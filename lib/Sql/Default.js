const Sql = require('../Sql');

class Default extends Sql {
  getText() {
    return 'DEFAULT';
  }
}

module.exports = Default;
