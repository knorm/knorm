const knorm = require('@knorm/knorm');
const KnormVirtuals = require('../lib/KnormVirtuals');
const knormVirtuals = require('../');
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
