class Grouping {
  constructor({ type, value }) {
    this.type = type;
    this.value = value;
  }

  _formatWhere(sql, item) {
    if (item instanceof Query) {
      const { sql, values } = new Sql(item.Model).formatSelect(
        item.getOptions()
      );
      return { where: `(${sql})`, values };
    }

    if (item instanceof Grouping || item instanceof Condition) {
      return item.formatWhere(sql);
    }

    if (item instanceof Raw) {
      return { where: item.sql, values: item.values };
    }

    if (typeof item === 'object' && !Array.isArray(item)) {
      const grouping = new Grouping({
        type: 'and',
        value: Object.entries(item).map(([field, value]) => {
          return new Condition({ type: 'equalTo', field, value });
        })
      });

      return grouping.formatWhere(sql);
    }

    return { where: '?', values: [item] };
  }

  formatWhere(sql) {
    let value = this.value;

    if (!Array.isArray(value)) {
      value = [value];
    }

    const wheres = [];
    let values = [];

    value.forEach(item => {
      const where = this._formatWhere(sql, item);
      wheres.push(where.where);
      values = values.concat(where.values);
    });

    if (wheres.length === 1) {
      return { where: wheres[0], values };
    }

    let where;

    if (this.type === 'and') {
      where = wheres.join(' AND ');
    } else if (this.type === 'or') {
      where = wheres.join(' OR ');
    }

    where = `(${where})`;

    return { where, values };
  }
}

module.exports = Grouping;

const Raw = require('./Raw');
const Sql = require('../Sql');
const Query = require('../../Query');
const Condition = require('./Condition');
