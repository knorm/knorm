const Sql = require('../Sql');

class Values extends Sql {
  formatValue() {
    // TODO: first figure out how Query will set this up

    // TODO: test values as Query
    // TODO: test values as Part
    // TODO: test values as array
    return this.formatExpressions(this.getValue(), {
      formatExpression: values => {
        return this.formatExpressions(values, {
          // TODO: test row as Query
          // TODO: test row as Part
          // TODO: test row as array
          // TODO: test row as empty array
          formatExpression: row => {
            const formattedRow = this.formatExpression(row, {
              formatArray: row => {
                if (!row.length) {
                  return this.throwSqlError(`empty row`);
                }

                // TODO: test value as Query
                // TODO: test value as Part
                // TODO: test value as array
                // TODO: test value as object
                // TODO: test value as primitive
                return this.formatExpressions(row);
              }
            });

            return `(${formattedRow})`;
          }
        });
      }
    });
  }

  getText() {
    return `VALUES ${this.formatValue()}`;
  }
}

module.exports = Values;
