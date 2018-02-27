const expect = require('unexpected');
const knex = require('./lib/knex');
const WithKnex = require('../lib/WithKnex');
const KnormError = require('../lib/KnormError');

describe('WithKnex', function() {
  describe('WithKnex.knex', function() {
    describe('as a getter', function() {
      it('throws an error if knex has not been set', function() {
        class Foo extends WithKnex {}
        expect(
          () => Foo.knex,
          'to throw',
          new KnormError('Foo.knex is not configured')
        );
      });

      it('returns the configured knex instance if knex has been set', function() {
        class Foo extends WithKnex {}
        Foo.knex = knex;
        expect(Foo.knex, 'to equal', knex);
      });
    });

    describe('as a setter', function() {
      it('does not set WithKnex.knex when a subclass sets knex', function() {
        class Foo extends WithKnex {}
        Foo.knex = knex;
        expect(
          () => WithKnex.knex,
          'to throw',
          new KnormError('WithKnex.knex is not configured')
        );
      });

      it('does not set knex for other WithKnex subclasses', function() {
        class Foo extends WithKnex {}
        class Bar extends WithKnex {}
        Foo.knex = knex;
        expect(
          () => Bar.knex,
          'to throw',
          new KnormError('Bar.knex is not configured')
        );
      });

      it('throws an error if not provided a knex instance', () => {
        class Foo extends WithKnex {}
        expect(
          () => {
            Foo.knex = undefined;
          },
          'to throw',
          new KnormError('Foo: no knex instance provided')
        );
      });

      it('throws an error if provided an invalid knex instance', () => {
        class Foo extends WithKnex {}
        expect(
          () => {
            Foo.knex = 'foo';
          },
          'to throw',
          new KnormError('Foo: invalid knex instance provided')
        );
      });
    });
  });
});
