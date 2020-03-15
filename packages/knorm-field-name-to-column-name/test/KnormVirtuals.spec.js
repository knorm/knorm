const KnormVirtuals = require('../src/KnormVirtuals');
const expect = require('unexpected').clone();

const { KnormVirtualsError } = KnormVirtuals;

describe('KnormVirtuals', () => {
  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormVirtuals().init(),
        'to throw',
        new KnormVirtualsError('no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormVirtuals().init({}),
        'to throw',
        new KnormVirtualsError('invalid Knorm instance provided')
      );
    });
  });
});
