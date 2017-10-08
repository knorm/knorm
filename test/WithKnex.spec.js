const WithKnex = require('../lib/WithKnex');
const expect = require('unexpected');

describe('WithKnex', function() {
  describe('WithKnex.knex', function() {
    describe('as a getter', function() {
      it('throws an error if knex has not been set', function() {
        class Foo extends WithKnex {}
        expect(
          () => Foo.knex,
          'to throw',
          new Error('Foo.knex is not configured')
        );
      });

      it('returns the configured knex instance if knex has been set', function() {
        class Foo extends WithKnex {}
        Foo.knex = 'the knex instance';
        expect(Foo.knex, 'to be', 'the knex instance');
      });
    });

    describe('as a setter', function() {
      it('does not set WithKnex.knex when a subclass sets knex', function() {
        class Foo extends WithKnex {}
        Foo.knex = 'the knex instance';
        expect(
          () => WithKnex.knex,
          'to throw',
          new Error('WithKnex.knex is not configured')
        );
      });

      it('does not set knex for other WithKnex subclasses', function() {
        class Foo extends WithKnex {}
        class Bar extends WithKnex {}
        Foo.knex = 'the knex instance';
        expect(
          () => Bar.knex,
          'to throw',
          new Error('Bar.knex is not configured')
        );
      });
    });
  });
});
