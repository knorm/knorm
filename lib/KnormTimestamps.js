const { Knorm, KnormError } = require('knorm');

class KnormTimestamps {
  constructor(config = {}) {
    const { createdAt = {}, updatedAt = {} } = config;

    this.fields = {};
    this.fields[createdAt.name || 'createdAt'] = {
      type: 'dateTime',
      column: createdAt.column || 'created_at',
      default: () => new Date(),
      updated: false
    };
    this.updatedAtFieldName = updatedAt.name || 'updatedAt';
    this.fields[this.updatedAtFieldName] = {
      type: 'dateTime',
      column: updatedAt.column || 'updated_at',
      default: () => new Date()
    };
  }

  updateModel(knorm) {
    knorm.Model = class ModelWithTimestamps extends knorm.Model {};
    knorm.Model.fields = this.fields;
  }

  updateQuery(knorm) {
    const { updatedAtFieldName } = this;
    class QueryWithTimestamps extends knorm.Query {
      async update(data, options) {
        if (data) {
          data[updatedAtFieldName] = new Date();
        }
        return super.update(data, options);
      }
    }
    knorm.Model.Query = knorm.Query = QueryWithTimestamps;
  }

  init(knorm) {
    if (!knorm) {
      throw new KnormError('KnormTimestamps: no Knorm instance provided');
    }

    if (!(knorm instanceof Knorm)) {
      throw new KnormError('KnormTimestamps: invalid Knorm instance provided');
    }

    this.updateModel(knorm);
    this.updateQuery(knorm);
  }
}

module.exports = KnormTimestamps;
