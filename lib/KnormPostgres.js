const { Knorm, KnormError } = require('knorm');

class KnormPostgres {
  updateField(knorm) {
    const { Field } = knorm;

    knorm.Field = knorm.Model.Field = class PostgresField extends Field {
      cast(value, modelInstance, options) {
        if (this.type !== 'json' && this.type !== 'jsonb') {
          return super.cast(value, modelInstance, options);
        }

        if (value !== null && options.forSave) {
          if (this.castors && this.castors.forSave) {
            return super.cast(value, modelInstance, options);
          }
          return JSON.stringify(value);
        }
      }

      validateIsString(value, type) {
        super.validateIsString(value, type);
        this.validateMaxLengthIs(value, 255);
      }
    };
  }

  init(knorm) {
    if (!knorm) {
      throw new KnormError('KnormPostgres: no Knorm instance provided');
    }

    if (!(knorm instanceof Knorm)) {
      throw new KnormError('KnormPostgres: invalid Knorm instance provided');
    }

    this.updateField(knorm);
  }
}

module.exports = KnormPostgres;
