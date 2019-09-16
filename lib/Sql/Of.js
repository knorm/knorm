const Sql = require('../Sql');

class Of extends Sql {
  getText() {
    const _of = this.value
      .map(field => this.formatColumnExpression(field))
      .join(', ');

    return `OF ${_of}`;
  }
}

module.exports = Of;
