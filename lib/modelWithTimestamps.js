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
      type: 'dateTime',
      default: createdAt.addDefault ? () => new Date() : undefined,
      column: createdAt.column || 'created_at'
    };
    fieldNames.createdAt = createdAtName;
  }

  if (updatedAt) {
    const updatedAtName = updatedAt.name || 'updatedAt';
    fields[updatedAtName] = {
      type: 'dateTime',
      default: updatedAt.addDefault ? () => new Date() : undefined,
      column: updatedAt.column || 'updated_at'
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
