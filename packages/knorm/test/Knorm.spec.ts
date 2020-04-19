import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import { Knorm } from '../src/Knorm';
import { Field } from '../src/Field';
import { Query } from '../src/Query';
import { Model } from '../src/Model';
import { Connection } from '../src/Connection';
import { Transaction } from '../src/Transaction';
import { KnormError } from '../src/KnormError';
import { Plugin } from '../src/Plugin';

const expect = unexpected.clone().use(unexpectedSinon);

describe('Knorm', () => {
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

    it('adds an accessor to the knorm instance', function () {
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

    describe('with the `fieldToColumn` option provided', () => {
      it('configures it as the field-to-column-name mapping function', () => {
        const { Model } = new Knorm({
          fieldToColumn(field): string {
            return field.toLowerCase();
          },
        });
        Model.fields = { firstName: { type: 'string' } };
        expect(Model.fields.firstName.column, 'to be', 'firstname');
      });

      it('calls it with `this` set to the field instance', () => {
        let wasCalled;
        const { Model } = new Knorm({
          fieldToColumn(fieldName): string {
            wasCalled = true;
            expect(this.constructor.name, 'to be', 'Field');
            return fieldName;
          },
        });
        Model.fields = { firstName: { type: 'string' } };
        expect(wasCalled, 'to be true');
      });
    });

    describe('with no `fieldToColumn` option provided', () => {
      it('does not configure a field-to-column-name mapping function', () => {
        const { Model } = new Knorm();
        Model.fields = { firstName: { type: 'string' } };
        expect(Model.fields.firstName.column, 'to be', 'firstName');
      });
    });
  });

  describe('use', () => {
    let knorm: Knorm;
    let plugin: Plugin;

    beforeEach(() => {
      knorm = new Knorm();

      class FooPlugin extends Plugin {
        init(): FooPlugin {
          return this;
        }
      }

      plugin = new FooPlugin();
    });

    it("calls a plugin's init method", () => {
      const spy = sinon.spy(plugin, 'init');
      knorm.use(plugin);
      expect(spy, 'to have calls satisfying', () => spy(knorm));
    });

    it('throws an error if a plugin by the same name is already added', () => {
      expect(
        () => knorm.use(plugin).use(plugin),
        'to throw',
        new KnormError('plugin `FooPlugin` has already been added')
      );
    });

    it('allows plugins to access themselves by name', function () {
      let ran = false;

      plugin.init = function (knorm: Knorm): Plugin {
        expect(knorm.plugins.FooPlugin, 'to be', plugin);
        ran = true;
        return this;
      };

      expect(ran, 'to be false');
      knorm.use(plugin);
      expect(ran, 'to be true');
    });
  });

  describe('addModel', () => {
    let knorm: Knorm;

    beforeEach(() => {
      knorm = new Knorm();
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
    let knorm: Knorm;

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
      class FooPlugin extends Plugin {
        init(knorm: Knorm): FooPlugin {
          knorm.Model = class Foo extends knorm.Model {};
          return this;
        }
      }

      const plugin = new FooPlugin();

      knorm.use(plugin);
      const clone = knorm.clone();

      expect(clone.plugins.FooPlugin, 'to be', plugin);
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
      class FooPlugin extends Plugin {
        init(knorm: Knorm): FooPlugin {
          knorm.Model = class Foo extends knorm.Model {};
          return this;
        }
      }

      const clone = knorm.clone();
      const fooPlugin = new FooPlugin();

      clone.use(fooPlugin);

      expect(clone.plugins.FooPlugin, 'to be', fooPlugin);
      expect(clone.Model.name, 'to be', 'Foo');

      expect(knorm.plugins, 'to be empty');
      expect(knorm.Model.name, 'to be', 'Model');
    });
  });

  describe('updateTransaction', () => {
    let knorm: Knorm;
    let FooTransaction: typeof Transaction;

    beforeEach(() => {
      knorm = new Knorm();
      FooTransaction = class extends Transaction {};
    });

    it('updates Knorm.prototype.Transaction', () => {
      knorm.updateTransaction(FooTransaction);
      expect(knorm.Transaction, 'to be', FooTransaction);
    });

    it('allows chaining', () => {
      expect(knorm.updateTransaction(FooTransaction), 'to be', knorm);
    });
  });

  describe('updateModel', () => {
    let knorm: Knorm;
    let FooModel: typeof Model;

    beforeEach(() => {
      knorm = new Knorm();
      FooModel = class extends Model {};
    });

    it('updates Knorm.prototype.Model', () => {
      knorm.updateModel(FooModel);
      expect(knorm.Model, 'to be', FooModel);
    });

    it('allows chaining', () => {
      expect(knorm.updateModel(FooModel), 'to be', knorm);
    });
  });

  describe('updateQuery', () => {
    let knorm: Knorm;
    let FooQuery: typeof Query;

    beforeEach(() => {
      knorm = new Knorm();
      FooQuery = class extends Query {};
    });

    it('updates Knorm.prototype.Query', () => {
      knorm.updateQuery(FooQuery);
      expect(knorm.Query, 'to be', FooQuery);
    });

    it('updates Knorm.Model.Query', () => {
      knorm.updateQuery(FooQuery);
      expect(knorm.Model.Query, 'to be', FooQuery);
    });

    it('allows chaining', () => {
      expect(knorm.updateQuery(FooQuery), 'to be', knorm);
    });
  });

  describe('updateField', () => {
    let knorm: Knorm;
    let FooField: typeof Field;

    beforeEach(() => {
      knorm = new Knorm();
      FooField = class extends Field {};
    });

    it('updates Knorm.prototype.Field', () => {
      knorm.updateField(FooField);
      expect(knorm.Field, 'to be', FooField);
    });

    it('updates Knorm.Model.Field', () => {
      knorm.updateField(FooField);
      expect(knorm.Model.Field, 'to be', FooField);
    });

    it('allows chaining', () => {
      expect(knorm.updateField(FooField), 'to be', knorm);
    });
  });

  describe('updateConnection', () => {
    let knorm: Knorm;
    let FooConnection: typeof Connection;

    beforeEach(() => {
      knorm = new Knorm();
      FooConnection = class extends Connection {};
    });

    it('updates Knorm.prototype.Connection', () => {
      knorm.updateConnection(FooConnection);
      expect(knorm.Connection, 'to be', FooConnection);
    });

    it('updates Knorm.Query.Connection', () => {
      knorm.updateConnection(FooConnection);
      expect(knorm.Query.Connection, 'to be', FooConnection);
    });

    it('updates Knorm.Transaction.Connection', () => {
      knorm.updateConnection(FooConnection);
      expect(knorm.Transaction.Connection, 'to be', FooConnection);
    });

    it('allows chaining', () => {
      expect(knorm.updateConnection(FooConnection), 'to be', knorm);
    });
  });
});
