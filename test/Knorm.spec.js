const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const Knorm = require('../lib/Knorm');
const KnormError = require('../lib/KnormError');
const Field = require('../lib/Field');
const Model = require('../lib/Model');
const Query = require('../lib/Query');
const Connection = require('../lib/Connection');
const Transaction = require('../lib/Transaction');

describe.only('Knorm', () => {
  it('exposes Field, Model, Query, Transaction as statics', () => {
    expect(Knorm.Field, 'to be', Field);
    expect(Knorm.Model, 'to be', Model);
    expect(Knorm.Query, 'to be', Query);
    expect(Knorm.Connection, 'to be', Connection);
    expect(Knorm.Transaction, 'to be', Transaction);
  });

  describe('constructor', () => {
    it('creates scoped Field, Model, Query, Connection, Transaction', () => {
      const knorm = new Knorm();

      expect(knorm.Field.prototype, 'to be a', Field);
      expect(knorm.Model.prototype, 'to be a', Model);
      expect(knorm.Query.prototype, 'to be a', Query);
      expect(knorm.Connection.prototype, 'to be a', Connection);
      expect(knorm.Transaction.prototype, 'to be a', Transaction);

      expect(knorm.Model.Field, 'to be', knorm.Field);
      expect(knorm.Model.Query, 'to be', knorm.Query);

      expect(knorm.Query.Connection, 'to be', knorm.Connection);
      expect(knorm.Model.Query.Connection, 'to be', knorm.Connection);
      expect(knorm.Transaction.Connection, 'to be', knorm.Connection);
    });

    it('adds an accessor to the knorm instance', function() {
      const knorm = new Knorm();

      class User extends knorm.Model {}
      User.table = 'user';

      expect(knorm.Field.knorm, 'to be', knorm);
      expect(knorm.Model.knorm, 'to be', knorm);
      expect(knorm.Query.knorm, 'to be', knorm);
      expect(knorm.Connection.knorm, 'to be', knorm);
      expect(knorm.Transaction.knorm, 'to be', knorm);

      expect(knorm.Field.prototype.knorm, 'to be', knorm);
      expect(knorm.Model.prototype.knorm, 'to be', knorm);
      expect(knorm.Query.prototype.knorm, 'to be', knorm);
      expect(knorm.Connection.prototype.knorm, 'to be', knorm);
      expect(knorm.Transaction.prototype.knorm, 'to be', knorm);

      const KnormUser = knorm.models.User;

      expect(KnormUser.knorm, 'to be', knorm);
      expect(KnormUser.Field.knorm, 'to be', knorm);
      expect(KnormUser.Query.knorm, 'to be', knorm);
      expect(KnormUser.Query.Connection.knorm, 'to be', knorm);

      expect(KnormUser.prototype.knorm, 'to be', knorm);
      expect(KnormUser.Field.prototype.knorm, 'to be', knorm);
      expect(KnormUser.Query.prototype.knorm, 'to be', knorm);
      expect(KnormUser.Query.Connection.prototype.knorm, 'to be', knorm);
    });

    it('creates new classes per instance', () => {
      const firstOrm = new Knorm();
      const secondOrm = new Knorm();
      expect(firstOrm.Query, 'not to be', secondOrm.Query);
    });
  });

  describe('use', () => {
    let knorm;

    beforeEach(() => {
      knorm = new Knorm();
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
        const foo = () => {};
        expect(knorm.use(foo), 'to equal', knorm);
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
      knorm = new Knorm();
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

    it('adds the model to the Knorm instance', () => {
      class Foo extends knorm.Model {}

      knorm.addModel(Foo);

      expect(knorm.models.Foo, 'to be', Foo);
    });

    it('adds a model that extends another model', () => {
      class Foo extends knorm.Model {}
      class Bar extends Foo {}

      knorm.addModel(Bar);

      expect(knorm.models.Bar, 'to be', Bar);
    });

    it('allows plugins to update knorm.Model', () => {
      knorm.Model = class Foo extends knorm.Model {};
      knorm.addModel(knorm.Model);
      expect(knorm.Model, 'to be', knorm.Model);
    });

    it('allows chaining', () => {
      class Foo extends knorm.Model {}
      expect(knorm.addModel(Foo), 'to be', knorm);
    });
  });

  describe('clone', () => {
    let knorm;

    beforeEach(() => {
      knorm = new Knorm();
    });

    it('returns a Knorm instance', () => {
      expect(knorm.clone(), 'to be a', Knorm);
    });

    it('returns a different instance', () => {
      expect(knorm.clone(), 'not to be', knorm);
    });

    it('adds models on the original instance to the clone', () => {
      class Foo extends knorm.Model {}
      knorm.addModel(Foo);
      const clone = knorm.clone();
      expect(clone.models.Foo, 'to be', Foo);
    });

    it('adds plugins on the original instance to the clone', () => {
      function foo(knorm) {
        knorm.Model = class Foo extends knorm.Model {};
      }

      knorm.use(foo);
      const clone = knorm.clone();

      expect(clone.plugins.foo, 'to be', foo);
      expect(clone.Model.name, 'to be', 'Foo');
    });

    it('allows adding new models to the clone only', () => {
      const clone = knorm.clone();

      class Bar extends clone.Model {}
      clone.addModel(Bar);

      expect(clone.models.Bar, 'to be', Bar);
      expect(knorm.models.Bar, 'to be undefined');
    });

    it('allows adding new plugins to the clone only', () => {
      const clone = knorm.clone();

      function foo(knorm) {
        knorm.Model = class Foo extends knorm.Model {};
      }

      clone.use(foo);

      expect(clone.plugins.foo, 'to be', foo);
      expect(clone.Model.name, 'to be', 'Foo');

      expect(knorm.plugins, 'to be empty');
      expect(knorm.Model.name, 'to be', 'Model');
    });
  });

  describe('updateTransaction', () => {
    it('updates Knorm.prototype.Transaction', () => {
      class Foo {}
      const knorm = new Knorm().updateTransaction(Foo);
      expect(knorm.Transaction, 'to be', Foo);
    });

    it('allows chaining', () => {
      class Foo {}
      const knorm = new Knorm();
      expect(knorm.updateTransaction(Foo), 'to be', knorm);
    });
  });

  describe('updateModel', () => {
    it('updates Knorm.prototype.Model', () => {
      class Foo {}
      const knorm = new Knorm().updateModel(Foo);
      expect(knorm.Model, 'to be', Foo);
    });

    it('allows chaining', () => {
      class Foo {}
      const knorm = new Knorm();
      expect(knorm.updateModel(Foo), 'to be', knorm);
    });
  });

  describe('updateField', () => {
    it('updates Knorm.prototype.Field', () => {
      class Foo {}
      const knorm = new Knorm().updateField(Foo);
      expect(knorm.Field, 'to be', Foo);
    });

    it('updates Knorm.Model.Field', () => {
      class Foo {}
      const knorm = new Knorm().updateField(Foo);
      expect(knorm.Model.Field, 'to be', Foo);
    });

    it('allows chaining', () => {
      class Foo {}
      const knorm = new Knorm();
      expect(knorm.updateField(Foo), 'to be', knorm);
    });
  });

  describe('updateQuery', () => {
    it('updates Knorm.prototype.Query', () => {
      class Foo {}
      const knorm = new Knorm().updateQuery(Foo);
      expect(knorm.Query, 'to be', Foo);
    });

    it('updates Knorm.Model.Query', () => {
      class Foo {}
      const knorm = new Knorm().updateQuery(Foo);
      expect(knorm.Model.Query, 'to be', Foo);
    });

    it('allows chaining', () => {
      class Foo {}
      const knorm = new Knorm();
      expect(knorm.updateQuery(Foo), 'to be', knorm);
    });
  });

  describe('updateSql', () => {
    it('updates Knorm.prototype.Sql', () => {
      class Foo {}
      const knorm = new Knorm().updateSql(Foo);
      expect(knorm.Sql, 'to be', Foo);
    });

    it('updates Knorm.Model.Sql', () => {
      class Foo {}
      const knorm = new Knorm().updateSql(Foo);
      expect(knorm.Model.Sql, 'to be', Foo);
    });

    it('allows chaining', () => {
      class Foo {}
      const knorm = new Knorm();
      expect(knorm.updateSql(Foo), 'to be', knorm);
    });
  });

  describe('updateConnection', () => {
    it('updates Knorm.prototype.Connection', () => {
      class Foo {}
      const knorm = new Knorm().updateConnection(Foo);
      expect(knorm.Connection, 'to be', Foo);
    });

    it('updates Knorm.Query.Connection', () => {
      class Foo {}
      const knorm = new Knorm().updateConnection(Foo);
      expect(knorm.Query.Connection, 'to be', Foo);
    });

    it('updates Knorm.Transaction.Connection', () => {
      class Foo {}
      const knorm = new Knorm().updateConnection(Foo);
      expect(knorm.Transaction.Connection, 'to be', Foo);
    });

    it('allows chaining', () => {
      class Foo {}
      const knorm = new Knorm();
      expect(knorm.updateConnection(Foo), 'to be', knorm);
    });
  });
});
