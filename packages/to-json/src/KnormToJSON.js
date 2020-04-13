const { Knorm } = require('@knorm/knorm');

class KnormToJSON {
  constructor({ exclude = [], name = 'toJSON' } = {}) {
    this.name = name;

    if (!Array.isArray(exclude)) {
      exclude = [exclude];
    }

    this.exclude = exclude;
  }

  updateModel(knorm) {
    let excluded = this.exclude.reduce((fields, field) => {
      fields[field] = true;
      return fields;
    }, {});

    class ToJSONModel extends knorm.Model {
      toJSON() {
        const modelOptions = this.constructor.options;

        if (
          modelOptions &&
          modelOptions.plugins &&
          modelOptions.plugins.toJSON &&
          modelOptions.plugins.toJSON.exclude
        ) {
          let exclude = modelOptions.plugins.toJSON.exclude;

          if (!Array.isArray(exclude)) {
            exclude = [exclude];
          }

          excluded = Object.assign({}, excluded);
          exclude.forEach((field) => {
            excluded[field] = true;
          });
        }

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
    }

    knorm.updateModel(ToJSONModel);
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
