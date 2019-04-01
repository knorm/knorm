const Condition = require('./Condition');
const Raw = require('./Raw');

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

  getWhere(sql) {
    let value = this.value;

    if (!Array.isArray(value)) {
      value = [value];
    }

    const wheres = [];
    let values = [];

    value.forEach(item => {
      let where;

      if (item instanceof Grouping || item instanceof Condition) {
        where = item.getWhere(sql);
      } else if (item instanceof Raw) {
        where = { where: item.sql, values: item.values };
      } else if (typeof item === 'object') {
        // TODO: test object with plain, Raw, Query and Condition values
        const grouping = this._createGrouping(item);
        where = grouping.getWhere(sql);
      } else {
        // TODO: test this
        where = { where: sql.getPlaceholder(), values: [item] };
      }

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

    // TODO: are parens needed for AND?
    where = `(${where})`;

    return { where, values };
  }
}

module.exports = Grouping;
