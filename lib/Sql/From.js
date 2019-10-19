const Sql = require('../Sql');

class From extends Sql {
  formatValue() {
    return this.formatExpressions(this.getValue(), {
      formatExpression: item => {
        const expression = this.formatExpression(item);

        if (item instanceof Raw) {
          return expression;
        }

        const options = this.getOptions();
        const qualifier = options && options.qualifier;

        if (!qualifier) {
          return expression;
        }

        return this.formatAlias(expression, this.formatIdentifier(qualifier));
      }
    });
  }

  formatText() {
    return `FROM ${this.formatValue()}`;
  }
}

module.exports = From;

const Raw = require('./Raw');
