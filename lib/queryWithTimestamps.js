const { Query: KnormQuery } = require('knorm');

module.exports = Base => {
  if (!(Base.prototype instanceof KnormQuery) && Base !== KnormQuery) {
    throw new Error('base class is not a knorm query class');
  }

  class QueryWithTimestamps extends Base {
    async update(data) {
      const instance = this._getValidatedInstance(data, 'update');

      const createdAtField = this.model.fields[this.model.fieldNames.createdAt];
      if (createdAtField) {
        instance[this.model.fieldNames.createdAt] = undefined;
      }

      const updatedAtField = this.model.fields[this.model.fieldNames.updatedAt];
      if (updatedAtField && updatedAtField.hasDefault()) {
        instance[this.model.fieldNames.updatedAt] = updatedAtField.getDefault(
          instance
        );
      }

      return super.update(instance);
    }
  }

  return QueryWithTimestamps;
};
