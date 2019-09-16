const Sql = require('../Sql');

class Fields extends Sql {
  getText() {
    const fields = [];
    const expressions = [];

    for (const item of this.value) {
      expressions.push(
        this.formatExpression(item, {
          formatObject: fields => {
            const expressions = [];
            for (const [alias, field] of Object.entries(fields)) {
              fields.push(alias);
              expressions.push(this.formatExpression(field));
            }
            return expressions.join(', ');
          },
          formatPrimitive: field => {
            fields.push(field);
            return this.formatColumnExpression(field);
          }
        })
      );
    }

    this.addFields(fields);

    return expressions.join(', ');
  }
}

module.exports = Fields;
