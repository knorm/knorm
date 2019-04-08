class Grouping {
  constructor({ type, value }) {
    this.type = type;
    this.value = value;
  }

  formatValue(sql, value) {
    if (value instanceof Query) {
      const { sql, values } = value.formatQuery();
      return { sql: `(${sql})`, values };
    }

    if (value instanceof Grouping) {
      return value.formatGrouping(sql);
    }

    if (value instanceof Condition) {
      return value.formatCondition(sql);
    }

    if (value instanceof Raw) {
      return value.formatRaw(sql);
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      const grouping = new Grouping({
        type: 'and',
        value: Object.entries(value).map(([field, value]) => {
          return new Condition({ type: 'equalTo', field, value });
        })
      });

      return grouping.formatGrouping(sql);
    }

    return { sql: '?', values: [value] };
  }

  formatGrouping(sql) {
    const sqls = [];
    let values = [];

    (Array.isArray(this.value) ? this.value : [this.value]).forEach(value => {
      const formattedValue = this.formatValue(sql, value);
      sqls.push(formattedValue.sql);

      if (formattedValue.values) {
        values = values.concat(formattedValue.values);
      }
    });

    let sqlString;

    if (sqls.length > 1) {
      if (this.type === 'and') {
        sqlString = sqls.join(' AND ');
      } else if (this.type === 'or') {
        sqlString = sqls.join(' OR ');
      }
      sqlString = `(${sqlString})`;
    } else {
      sqlString = sqls[0];
    }

    const formatted = { sql: sqlString };

    if (values.length) {
      formatted.values = values;
    }

    return formatted;
  }
}

module.exports = Grouping;

const Raw = require('./Raw');
const Query = require('../Query');
const Condition = require('./Condition');
