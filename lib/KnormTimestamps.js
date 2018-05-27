const { Knorm } = require('@knorm/knorm');

class KnormTimestamps {
  constructor({ createdAt = {}, updatedAt = {}, name = 'timestamps' } = {}) {
    this.name = name;

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
    knorm.Model = class TimestampsModel extends knorm.Model {};
    knorm.Model.fields = this.fields;
  }

  updateQuery(knorm) {
    const { updatedAtFieldName } = this;
    class TimestampsQuery extends knorm.Query {
      async update(data, options) {
        if (data) {
          (Array.isArray(data) ? data : [data]).forEach(data => {
            data[updatedAtFieldName] = new Date();
          });
        }
        return super.update(data, options);
      }
    }
    knorm.Model.Query = knorm.Query = TimestampsQuery;
  }

  init(knorm) {
    if (!knorm) {
      throw new this.constructor.KnormTimestampsError(
        'no Knorm instance provided'
      );
    }

    if (!(knorm instanceof Knorm)) {
      throw new this.constructor.KnormTimestampsError(
        'invalid Knorm instance provided'
      );
    }

    this.updateModel(knorm);
    this.updateQuery(knorm);
  }
}

KnormTimestamps.KnormTimestampsError = class KnormTimestampsError extends Knorm.KnormError {};

module.exports = KnormTimestamps;
