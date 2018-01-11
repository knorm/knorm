const knorm = require('knorm');
const { KnormError } = knorm;
const KnormPostgres = require('../lib/KnormPostgres');
const knormPostgres = require('../');
const expect = require('unexpected').clone();

describe('KnormPostgres', () => {
  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormPostgres().init(),
        'to throw',
        new KnormError('KnormPostgres: no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormPostgres().init({}),
        'to throw',
        new KnormError('KnormPostgres: invalid Knorm instance provided')
      );
    });
  });

  describe('updateField', () => {
    const { Field, Model } = knorm({ knex() {} }).use(knormPostgres());

    it('enforces maxLength 255 on all strings', async () => {
      const field = new Field({ name: 'foo', model: Model, type: 'string' });
      const value = Array(257).join('a');
      expect(value.length, 'to be', 256);
      await expect(field.validate(value), 'to be rejected with', {
        name: 'ValidationError',
        type: 'MaxLengthError'
      });
    });

    it('does not enforce maxLength 255 on text fields', async () => {
      const field = new Field({ name: 'foo', model: Model, type: 'text' });
      const value = Array(257).join('a');
      expect(value.length, 'to be', 256);
      await expect(field.validate(value), 'to be fulfilled');
    });
  });
});
