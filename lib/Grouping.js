class Grouping {
  constructor({ type, value }) {
    this.type = type;
    this.value = value;
  }

  _createGrouping(object) {
    return new Grouping({
      type: 'and',
      value: Object.entries(object).map(([field, value]) => {
        return new Condition({ type: 'equalTo', field, value });
      })
    });
  }

  _getWhere(value, sql) {
    if (value instanceof Query) {
      const { sql, values } = new Sql(value).getSelect();
      return { where: `(${sql})`, values };
    }

    if (value instanceof Grouping || value instanceof Condition) {
      return value.getWhere(sql);
    }

    if (value instanceof Raw) {
      return { where: value.sql, values: value.values };
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return this._createGrouping(value).getWhere(sql);
    }

    return { where: '?', values: [value] };
  }

  getWhere(sql) {
    let value = this.value;

    if (!Array.isArray(value)) {
      value = [value];
    }

    const wheres = [];
    let values = [];

    value.forEach(item => {
      const where = this._getWhere(item, sql);

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
const Sql = require('./Sql');
const Query = require('./Query');
const Condition = require('./Condition');
