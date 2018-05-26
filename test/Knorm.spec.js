const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const Knorm = require('../lib/Knorm');
const KnormError = require('../lib/KnormError');
const Query = require('../lib/Query');
const Model = require('../lib/Model');
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
      expect(knorm.Query.prototype instanceof Query, 'to be true');
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
        new KnormError('no plugin provided')
      );
    });

    it('throws an error if provided an invalid plugin', () => {
      expect(
        () => knorm.use('foo'),
        'to throw',
        new KnormError('invalid plugin provided')
      );
    });

    it('throws an error if the plugin has no name', () => {
      expect(
        () => knorm.use({ init() {} }),
        'to throw',
        new KnormError('plugins should have a `name`')
      );
    });

    it('throws an error if a plugin by the same name is already added', () => {
      expect(
        () =>
          knorm.use({ name: 'foo', init() {} }).use({ name: 'foo', init() {} }),
        'to throw',
        new KnormError('plugin `foo` has already been added')
      );
    });

    it('allows plugins to access themselves by name', function() {
      let ran = false;
      const plugin = {
        name: 'foo',
        init(knorm) {
          expect(knorm.plugins.foo, 'to be', plugin);
          ran = true;
        }
      };
      expect(ran, 'to be false');
      knorm.use(plugin);
      expect(ran, 'to be true');
    });

    describe('when called with a function', function() {
      it('passes itself to the function', () => {
        const plugin = sinon.spy().named('plugin');
        knorm.use(plugin);
        expect(plugin, 'to have calls satisfying', () => plugin(knorm));
      });

      it("registers the plugin by the function's name", () => {
        const foo = () => {};
        knorm.use(foo);
        expect(knorm.plugins.foo, 'to be', foo);
      });

      it('allows chaining', () => {
        expect(knorm.use(function foo() {}), 'to equal', knorm);
      });
    });

    describe('when called with an object with an `init` function', function() {
      it('passes itself to the `init` function', () => {
        const init = sinon.spy().named('init');
        knorm.use({ name: 'foo', init });
        expect(init, 'to have calls satisfying', () => init(knorm));
      });

      it('allows chaining', () => {
        expect(knorm.use({ name: 'foo', init() {} }), 'to equal', knorm);
      });
    });
  });

  describe('addModel', () => {
    let knorm;

    beforeEach(() => {
      knorm = new Knorm({ knex });
    });

    it('throws if not provided a model', () => {
      expect(
        () => knorm.addModel(),
        'to throw',
        new KnormError('no model provided')
      );
    });

    it('throws if the model is not a subclass of Model', () => {
      expect(
        () => knorm.addModel(class Foo {}),
        'to throw',
        new KnormError('model should be a subclass of `knorm.Model`')
      );
    });

    it('throws if the model extends a model from a different Knorm instance', () => {
      const knorm1 = new Knorm();
      const knorm2 = new Knorm();
      expect(
        () => knorm1.addModel(class Foo extends knorm2.Model {}),
        'to throw',
        new KnormError('model should be a subclass of `knorm.Model`')
      );
    });

    it('throws if the model extends `Model` directly', () => {
      expect(
        () => knorm.addModel(class Foo extends Model {}),
        'to throw',
        new KnormError('model should be a subclass of `knorm.Model`')
      );
    });

    it('throws if a model by the same name is already added', () => {
      knorm.addModel(class Foo extends knorm.Model {});
      expect(
        () => knorm.addModel(class Foo extends knorm.Model {}),
        'to throw',
        new KnormError('model `Foo` has already been added')
      );
    });

    it('throws if the model-name is a reserved Knorm property', () => {
      expect(
        () => knorm.addModel(class Field extends knorm.Model {}),
        'to throw',
        new KnormError('cannot use `Field` as a model name (reserved property)')
      );
      expect(
        () => knorm.addModel(class use extends knorm.Model {}),
        'to throw',
        new KnormError('cannot use `use` as a model name (reserved property)')
      );
    });

    it('adds the model to the Knorm instance', () => {
      class Foo extends knorm.Model {}

      knorm.addModel(Foo);

      expect(knorm.Foo, 'to be', Foo);
      expect(knorm.models.Foo, 'to be', Foo);
    });

    it('adds the model that extends another model', () => {
      class Foo extends knorm.Model {}
      class Bar extends Foo {}

      knorm.addModel(Bar);

      expect(knorm.Bar, 'to be', Bar);
      expect(knorm.models.Bar, 'to be', Bar);
    });

    it('allows plugins to update knorm.Model', () => {
      knorm.Model = class Foo extends knorm.Model {};
      knorm.addModel(knorm.Model);
    });
  });
});
