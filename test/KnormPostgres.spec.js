const knorm = require('knorm');
const { KnormError } = knorm;
const KnormPostgres = require('../lib/KnormPostgres');
const knormPostgres = require('../');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));

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

    describe('for `json` and `jsonb` fields', () => {
      it('stringifies values before save', () => {
        const field = new Field({ name: 'foo', model: Model, type: 'json' });
        expect(
          field.cast({ foo: 'bar' }, null, { forSave: true }),
          'to be',
          JSON.stringify({ foo: 'bar' })
        );
      });

      it('does not stringify `null` values', () => {
        const field = new Field({ name: 'foo', model: Model, type: 'json' });
        expect(field.cast(null, { forSave: true }), 'to be undefined');
      });

      describe('with a forSave cast function configured', () => {
        describe('for `json` and `jsonb` fields', () => {
          it('uses the configred function for json fields', () => {
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'jsonb',
              cast: {
                forSave() {
                  return 'foo';
                }
              }
            });
            expect(
              field.cast({ foo: 'bar' }, null, { forSave: true }),
              'to be',
              'foo'
            );
          });

          it('calls the function with `this` set to the model instance', () => {
            const forSave = sinon.spy();
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'json',
              cast: { forSave }
            });
            const instance = { model: 'instace' };
            field.cast({ foo: 'bar' }, instance, { forSave: true }),
              expect(forSave, 'was called on', instance);
          });
        });

        describe('for other field types', () => {
          it('uses the configred function for other field types', () => {
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'text',
              cast: {
                forSave() {
                  return 'foo';
                }
              }
            });
            expect(field.cast('bar', null, { forSave: true }), 'to be', 'foo');
          });

          it('calls the function with `this` set to the model instance', () => {
            const forSave = sinon.spy();
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'string',
              cast: { forSave }
            });
            const instance = { model: 'instace' };
            field.cast('bar', instance, { forSave: true }),
              expect(forSave, 'was called on', instance);
          });
        });
      });
    });
  });
});
