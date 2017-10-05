module.exports = (Base, config = {}) => {
  const { Model: KnormModel } = require('knorm');

  if (!(Base.prototype instanceof KnormModel) && Base !== KnormModel) {
    throw new Error('base class is not a knorm model class');
  }

  const fields = {};
  const fieldNames = {};
  const { deleted = {}, deletedAt } = config;
  const deletedName = deleted.name || 'deleted';

  fields[deletedName] = {
    type: 'boolean',
    column: deleted.column || 'deleted',
    default: false
  };
  fieldNames.deleted = deletedName;

  if (deletedAt) {
    const deletedAtName = deletedAt.name || 'deletedAt';
    fields[deletedAtName] = {
      type: 'dateTime',
      column: deletedAt.column || 'deleted_at'
    };
    fieldNames.deletedAt = deletedAtName;
  }

  class ModelWithSoftDelete extends Base {
    async restore(options) {
      const rows = await this._initQueryWithWhere(options, 'restore')
        .forge(false)
        .restore();

      if (!rows) {
        return rows;
      }

      return this.setData(rows[0]);
    }

    async hardDelete(options) {
      const rows = await this._initQueryWithWhere(options, 'hard delete')
        .forge(false)
        .hardDelete();

      if (!rows) {
        return rows;
      }

      return this.setData(rows[0]);
    }

    static async restore(options) {
      return this.query.restore(options);
    }

    static async hardDelete(options) {
      return this.query.hardDelete(options);
    }
  }

  ModelWithSoftDelete.fields = fields;
  ModelWithSoftDelete.fieldNames = fieldNames;

  return ModelWithSoftDelete;
};
