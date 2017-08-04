const { Model: KnormModel } = require('knorm');

module.exports = (Base, config = {}) => {
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
      return this._initQuery(options).restore(this);
    }

    static async restore(options) {
      return this.query.setOptions(options).restore();
    }
  }

  ModelWithSoftDelete.fields = fields;
  ModelWithSoftDelete.fieldNames = fieldNames;

  return ModelWithSoftDelete;
};
