const Sql = require('../Sql');

class Select extends Sql {
  formatColumns(options = {}) {
    return this.formatFields(options);
  }

  formatSelect(options) {
    const distinct = this.formatDistinct(options);
    const columns = this.formatColumns(options);
    const from = this.formatFrom(options);
    const where = this.formatWhere(options);
    const select = this.formatParts([distinct, columns, from, where], options);

    if (select) {
      select.sql = `SELECT ${select.sql}`;
    }

    return select;
  }
}

module.exports = Select;
