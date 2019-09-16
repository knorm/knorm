const Sql = require('../Sql');

class Values extends Sql {
  getText() {
    // TODO: first figure out how Query will set this up

    // TODO: test values as Query
    // TODO: test values as Part
    // TODO: test values as array
    const values = this.formatExpression(this.value, {
      formatArray: array => {
        return array
          .map(row => {
            // TODO: test row as Query
            // TODO: test row as Part
            // TODO: test row as array
            // TODO: test row as empty array
            row = this.formatExpression(row, {
              formatArray: row => {
                if (!row.length) {
                  return this.throwSqlError(`empty row`);
                }

                // TODO: test value as Query
                // TODO: test value as Part
                // TODO: test value as array
                // TODO: test value as object
                // TODO: test value as primitive
                return row
                  .map(value => this.formatExpression(value))
                  .join(', ');
              }
            });

            return `(${row})`;
          })
          .join(', ');
      }
    });

    return `VALUES ${values}`;
  }
}

module.exports = Values;
