const { Knorm } = require('@knorm/knorm');

class KnormToJSON {
  constructor({ exclude, name = 'toJSON' } = {}) {
    this.name = name;

    if (!Array.isArray(exclude)) {
      exclude = [exclude];
    }

    this.exclude = exclude;
  }

  updateModel(knorm) {
    const excluded = this.exclude.reduce((fields, field) => {
      fields[field] = true;
      return fields;
    }, {});

    knorm.Model = class ToJSONModel extends knorm.Model {
      toJSON() {
        return Object.entries(this)
          .filter(([field]) => {
            if (excluded[field]) {
              return false;
            }
            return true;
          })
          .reduce((data, [field, value]) => {
            data[field] = value;
            return data;
          }, {});
      }
    };
  }

  init(knorm) {
    if (!knorm) {
      throw new this.constructor.KnormToJSONError('no Knorm instance provided');
    }

    if (!(knorm instanceof Knorm)) {
      throw new this.constructor.KnormToJSONError(
        'invalid Knorm instance provided'
      );
    }

    this.updateModel(knorm);
  }
}

KnormToJSON.KnormToJSONError = class KnormToJSONError extends Knorm.KnormError {};

module.exports = KnormToJSON;
