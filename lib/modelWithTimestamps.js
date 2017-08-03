const { Model: KnormModel } = require('knorm');

module.exports = (Base, config = {}) => {
  if (!(Base.prototype instanceof KnormModel) && Base !== KnormModel) {
    throw new Error('base class is not a knorm model class');
  }

  const fields = {};
  const fieldNames = {};
  const { createdAt, updatedAt } = config;

  if (createdAt) {
    const createdAtName = createdAt.name || 'createdAt';
    fields[createdAtName] = {
      type: createdAt.type || 'dateTime',
      column: createdAt.column || 'created_at',
      default: createdAt.default
    };
    fieldNames.createdAt = createdAtName;
  }

  if (updatedAt) {
    const updatedAtName = updatedAt.name || 'updatedAt';
    fields[updatedAtName] = {
      type: updatedAt.type || 'dateTime',
      column: updatedAt.column || 'updated_at',
      default: updatedAt.default
    };
    fieldNames.updatedAt = updatedAtName;
  }

  class ModelWithTimestamps extends Base {}

  if (createdAt || updatedAt) {
    ModelWithTimestamps.fields = fields;
    ModelWithTimestamps.fieldNames = fieldNames;
  }

  return ModelWithTimestamps;
};
