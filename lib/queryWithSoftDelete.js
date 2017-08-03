const { Query: KnormQuery } = require('knorm');

module.exports = Base => {
  if (!(Base.prototype instanceof KnormQuery) && Base !== KnormQuery) {
    throw new Error('base class is not a knorm query class');
  }

  class QueryWithSoftDelete extends Base {
    constructor(model) {
      super(model);

      const deletedField = this.model.fields[this.model.fieldNames.deleted];
      if (deletedField) {
        this._where.push({
          field: deletedField,
          value: false
        });
      } else {
        const deletedAtField = this.model.fields[
          this.model.fieldNames.deletedAt
        ];
        if (deletedAtField) {
          this._whereNot.push({
            field: deletedField,
            value: null
          });
        }
      }
    }

    async delete() {
      const data = {};

      const deletedField = this.model.fields[this.model.fieldNames.deleted];
      if (deletedField) {
        data[this.model.fieldNames.deleted] = true;
      }

      const deletedAtField = this.model.fields[this.model.fieldNames.deletedAt];
      if (deletedAtField) {
        data[this.model.fieldNames.deletedAt] = new Date();
      }

      await this.update(data);

      return [];
    }
  }

  return QueryWithSoftDelete;
};
