const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const Knorm = require('../lib/Knorm');
const KnormError = require('../lib/KnormError');
const Query = require('../lib/Query');
const QueryError = require('../lib/QueryError');
const knex = require('./lib/knex');

describe('Knorm', () => {
  it('exposes abstract classes as statics', () => {
    expect(Knorm.Query, 'to be', Query);
    expect(Knorm.QueryError, 'to be', QueryError);
  });

  describe('constructor', () => {
    it('creates scoped Model, Query classes when instantiated', () => {
      const knorm = new Knorm({ knex });
      expect(knorm.Query, 'not to be', Query);
    });

    it('creates new classes per instance', () => {
      const firstOrm = new Knorm({ knex });
      const secondOrm = new Knorm({ knex });
      expect(firstOrm.Query, 'not to be', secondOrm.Query);
    });

    describe('with the `fieldToColumn` option provided', () => {
      it('configures it as the field-to-column-name mapping function', () => {
        const { Model } = new Knorm({
          knex,
          fieldToColumn(field) {
            return field.toLowerCase();
          }
        });
        Model.fields = { firstName: { type: 'string' } };
        expect(Model.fields.firstName.column, 'to be', 'firstname');
      });

      it('calls it with `this` set to the field instance', () => {
        let wasCalled;
        const { Model } = new Knorm({
          knex,
          fieldToColumn() {
            wasCalled = true;
            expect(this.constructor.name, 'to be', 'Field');
          }
        });
        Model.fields = { firstName: { type: 'string' } };
        expect(wasCalled, 'to be true');
      });
    });
  });

  describe('use', () => {
    let knorm;

    beforeEach(() => {
      knorm = new Knorm({ knex });
    });

    it('throws if not provided a plugin', () => {
      expect(
        () => knorm.use(),
        'to throw',
        new KnormError('Knorm: no plugin provided')
      );
    });

    it('throws an error if provided an invalid plugin', () => {
      expect(
        () => knorm.use('foo'),
        'to throw',
        new KnormError('Knorm: invalid plugin provided')
      );
    });

    describe('when called with a function', function() {
      it('passes itself to the function', () => {
        const plugin = sinon.spy().named('plugin');
        knorm.use(plugin);
        expect(plugin, 'to have calls satisfying', () => plugin(knorm));
      });

      it('allows chaining', () => {
        expect(knorm.use(() => {}), 'to equal', knorm);
      });
    });

    describe('when called with an object with an `init` function', function() {
      it('passes itself to the `init` function', () => {
        const init = sinon.spy().named('init');
        knorm.use({ init });
        expect(init, 'to have calls satisfying', () => init(knorm));
      });

      it('allows chaining', () => {
        expect(knorm.use({ init() {} }), 'to equal', knorm);
      });
    });
  });
});
