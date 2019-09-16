const Sql = require('../Sql');

class From extends Sql {
  getText() {
    const from = this.formatExpression(this.value, {
      formatArray: array => {
        const expressions = [];

        for (const item of array) {
          expressions.push(this.formatExpression(item));
        }

        return expressions.join(', ');
      }
    });

    return `FROM ${from}`;
  }
}

module.exports = From;
