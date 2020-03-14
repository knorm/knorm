const { Knorm } = require('@knorm/knorm');

class KnormVirtuals {
  constructor({ name = 'virtuals' } = {}) {
    this.name = name;
  }

  updateField(knorm) {
    class VirtualsField extends knorm.Field {}

    knorm.updateField(VirtualsField);
  }

  init(knorm) {
    if (!knorm) {
      throw new this.constructor.KnormVirtualsError('no Knorm instance provided');
    }

    if (!(knorm instanceof Knorm)) {
      throw new this.constructor.KnormVirtualsError(
        'invalid Knorm instance provided'
      );
    }

    this.updateField(knorm);
  }
}

KnormVirtuals.KnormVirtualsError = class KnormVirtualsError extends Knorm.KnormError {};

module.exports = KnormVirtuals;
