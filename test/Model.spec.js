const Knorm = require('../lib/Knorm');
const postgresPlugin = require('./lib/postgresPlugin');
const knex = require('./lib/knex');
const util = require('util');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'))
  .use(require('./lib/unexpected-workaround'));

describe.only('Model', () => {
  let Model;
  let Query;
  let Field;
  let ModelError;

  before(() => {
    ({ Model, Query, Field } = new Knorm());
    ModelError = Model.ModelError;
  });

  describe.only('constructor', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = { id: 'integer' };
    });

    it('creates a $values object', () => {
      const user = new User();
      expect(user.$values, 'not to be', User.prototype.$values);
    });

    it('re-creates $values per instance', () => {
      expect(new User().$values, 'not to be', new User().$values);
    });

    it('does not allow overwriting $values', () => {
      const user = new User();
      user.$values = { id: 1 };
      expect(user.$values, 'to equal', {});
    });

    it("adds a $config reference to the Model's config", () => {
      const user = new User();
      expect(user.$config, 'to be', User.config);
    });

    it('does not allow overwriting $config', () => {
      const user = new User();
      user.$config = { id: 1 };
      expect(user.$config, 'to be', User.config);
    });

    it('creates field setters and getters', () => {
      expect(Object.getOwnPropertyDescriptor(new User(), 'id'), 'to satisfy', {
        get: expect.it('to be a function'),
        set: expect.it('to be a function')
      });
    });

    describe('for non-virtual fields', () => {
      let user;

      beforeEach(() => {
        user = new User();
      });

      it('enables setting and getting field values', () => {
        user.id = 1;
        expect(user.id, 'to be', 1);
      });

      it('stores values in $values', () => {
        user.id = 1;
        expect(user.$values, 'to exhaustively satisfy', { id: 1 });
      });

      it('stores instance values separately', () => {
        const otherUser = new User();
        user.id = 1;
        otherUser.id = 2;
        expect(user.id, 'to be', 1);
        expect(otherUser.id, 'to be', 2);
      });

      describe('with field `setValue` and `getValue` functions set', () => {
        let getValue;
        let setValue;

        beforeEach(() => {
          getValue = sinon.spy().named('getValue');
          setValue = sinon.spy().named('setValue');
          User.fields = { confirmed: { type: 'boolean', getValue, setValue } };
          user = new User();
        });

        it("ignores the field's `setValue` and `getValue`", () => {
          user.confirmed = false;
          expect(user.confirmed, 'to be false');
          expect(setValue, 'was not called');
          expect(getValue, 'was not called');
        });
      });
    });

    describe('for virtual fields', () => {
      let user;
      let getValue;
      let setValue;

      beforeEach(() => {
        getValue = sinon.spy().named('getValue');
        setValue = sinon.spy().named('setValue');
        User.fields = { name: { type: 'virtual', getValue, setValue } };
        user = new User();
      });

      it("calls the field's `setValue` function to set data", () => {
        user.name = 'foo';
        expect(setValue, 'was called');
      });

      it("calls the field's `getValue` function to set data", () => {
        user.name; // eslint-disable-line no-unused-expressions
        expect(getValue, 'was called');
      });

      it('calls `setValue` with the Model instance and value', () => {
        user.name = 'foo';
        expect(setValue, 'to have calls satisfying', () =>
          setValue(user, 'foo')
        );
      });

      it('calls `getValue` with the Model instance', () => {
        user.name; // eslint-disable-line no-unused-expressions
        expect(getValue, 'to have calls satisfying', () => getValue(user));
      });

      describe('with no field `setValue` or `getValue` functions', () => {
        beforeEach(() => {
          User.fields = { confirmed: { type: 'boolean', virtual: true } };
          user = new User();
        });

        it('does nothing when the field value is set', () => {
          expect(() => (user.confirmed = false), 'not to throw');
        });

        it('returns `undefined` when the field value is accessed', () => {
          user.confirmed = false;
          expect(user.confirmed, 'to be undefined');
        });
      });
    });

    describe('if passed data', () => {
      it('calls Model.prototype.setData with the data', () => {
        const setData = sinon.spy(User.prototype, 'setData');
        new User({ id: 1 }); // eslint-disable-line no-new
        expect(setData, 'to have calls satisfying', () => setData({ id: 1 }));
        setData.restore();
      });
    });
  });

  describe.only('Model.prototype.setData', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        firstName: 'string',
        lastName: 'string',
        fullName: {
          type: 'virtual',
          getValue(model) {
            return `${model.firstName} ${model.lastName}`;
          },
          setValue(model, fullName) {
            fullName = fullName.split(' ');
            model.firstName = fullName[0];
            model.lastName = fullName[1];
          }
        },
        initials: {
          type: 'virtual',
          getValue(model) {
            return model.firstName[0] + model.lastName[0];
          }
        }
      };
      user = new User();
    });

    it('sets values for database fields', () => {
      user.setData({ firstName: 'foo', lastName: 'bar' });
      expect(user.firstName, 'to be', 'foo');
      expect(user.lastName, 'to be', 'bar');
    });

    it('sets values for virtual fields', () => {
      user.setData({ fullName: 'foo bar' });
      expect(user.firstName, 'to be', 'foo');
      expect(user.lastName, 'to be', 'bar');
    });

    it('sets values for arbitrary fields', () => {
      user.setData({ foo: 'foo' });
      expect(user.foo, 'to be', 'foo');
    });

    it('returns the Model instance', () => {
      expect(user.setData({ firstName: 1 }), 'to be', user);
    });

    it('does not set `undefined` values', () => {
      user.setData({ firstName: 'foo' });
      user.setData({ firstName: undefined });
      expect(user.firstName, 'to be', 'foo');
    });

    // https://github.com/knorm/knorm/issues/239
    it('does not set virtuals with no `setValue` function', () => {
      user.setData({ firstName: 'foo', lastName: 'bar' });
      expect(user.initials, 'to be', 'fb');
      user.setData({ initials: 'foo' });
      expect(user.initials, 'to be', 'fb');
    });

    it('does not allow overwriting $values', () => {
      expect(
        () => user.setData({ $values: { firstName: 'foo', lastName: 'bar' } }),
        'to throw',
        new TypeError(
          `Cannot assign to read only property '$values' of object '#<User>'`
        )
      );
    });

    it('does not allow overwriting $config', () => {
      expect(
        () => user.setData({ $config: { foo: 'bar' } }),
        'to throw',
        new TypeError(
          `Cannot assign to read only property '$config' of object '#<User>'`
        )
      );
    });
  });

  describe.only('Model.prototype.getData', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        firstName: 'string',
        lastName: 'string',
        fullName: {
          type: 'virtual',
          setValue(model, fullName) {
            fullName = fullName.split(' ');
            model.firstName = fullName[0];
            model.lastName = fullName[1];
          }
        },
        initials: {
          type: 'virtual',
          getValue(model) {
            return model.firstName[0] + model.lastName[0];
          }
        }
      };
      user = new User();
      user.setData({ firstName: 'foo', lastName: 'bar' });
    });

    it('returns values for database fields', () => {
      expect(user.getData(), 'to satisfy', {
        firstName: 'foo',
        lastName: 'bar'
      });
    });

    it('returns values for virtual fields', () => {
      expect(user.getData(), 'to satisfy', { initials: 'fb' });
    });

    it('returns values for arbitrary fields', () => {
      user.setData({ foo: 'foo' });
      expect(user.getData(), 'to satisfy', { foo: 'foo' });
    });

    it('allows specifying fields whose values to return', () => {
      expect(user.getData({ fields: ['firstName', 'initials'] }), 'to equal', {
        firstName: 'foo',
        initials: 'fb'
      });
    });

    it('returns values for directly assigned fields', () => {
      user.foo = 'foo';
      expect(user.getData(), 'to satisfy', { foo: 'foo' });
    });

    it('does not return `undefined` values', () => {
      user.foo = undefined;
      expect(user.getData(), 'not to have key', 'foo');
    });

    it('does not return values for virtuals with no `getValue` function', () => {
      expect(user.getData(), 'not to have key', 'fullName');
    });

    it('does not include $values', () => {
      expect(user.getData(), 'not to have key', '$values');
    });

    it('does not include $config', () => {
      expect(user.getData(), 'not to have key', '$config');
    });
  });

  describe.only('Model.prototype.setDefaults', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        id: 'integer',
        name: { type: 'string', default: 'foo' },
        confirmed: { type: 'boolean', default: false }
      };
      user = new User();
    });

    it('sets values for fields with defaults configured', () => {
      user.setDefaults();
      expect(user.name, 'to be', 'foo');
    });

    it('sets values for fields configured with falsy defaults', () => {
      user.setDefaults();
      expect(user.confirmed, 'to be false');
    });

    it('does not set values for fields with no defaults configured', () => {
      user.setDefaults();
      expect(user.id, 'to be undefined');
    });

    it('does not overwrite fields with values already set', () => {
      user.name = 'bar';
      user.setDefaults();
      expect(user.name, 'to be', 'bar');
    });

    it('returns the Model instance', () => {
      expect(user.setDefaults(), 'to be', user);
    });

    describe('when passed a list of fields to set defaults for', () => {
      it('sets defaults for only those fields', () => {
        user.setDefaults({ fields: ['name'] });
        expect(user, 'to satisfy', { name: 'foo', confirmed: undefined });
      });

      it('skips fields with no default values configured', () => {
        user.setDefaults({ fields: ['id', 'name'] });
        expect(user, 'to satisfy', { id: undefined, name: 'foo' });
      });
    });

    describe('for fields configured with a default-value function', () => {
      let User;
      let user;

      beforeEach(() => {
        User = class extends Model {};
        User.fields = {
          name: { type: 'string', default: () => 'foo' },
          initials: { type: 'boolean', default: model => model.name[0] }
        };
        user = new User();
      });

      it("sets the field value from the function's return value", () => {
        user.setDefaults();
        expect(user.name, 'to be', 'foo');
      });

      it("passes the Model instance as the function's first parameter", () => {
        user.setDefaults();
        expect(user.initials, 'to be', 'f');
      });
    });
  });

  describe.only('Model.prototpye[util.inspect.custom]', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        id: 'integer',
        firstName: 'string',
        lastName: 'string',
        fullName: {
          type: 'virtual',
          getValue(model) {
            if (!model.firstName && !model.lastName) {
              return;
            }

            return `${model.firstName} ${model.lastName}`;
          }
        }
      };
      user = new User();
    });

    it('inspects instances with no data', () => {
      expect(user[util.inspect.custom](2, {}), 'to be', 'User {}');
    });

    it('inspects instances with field data', () => {
      user.setData({ id: 1, firstName: 'foo', lastName: 'bar' });
      expect(
        user[util.inspect.custom](2, {}),
        'to be',
        "User { id: 1, firstName: 'foo', lastName: 'bar', fullName: 'foo bar' }"
      );
    });

    it('inspects instances with custom data', () => {
      user.setData({ foo: 'bar' });
      expect(user[util.inspect.custom](2, {}), 'to be', "User { foo: 'bar' }");
    });

    it('supports `depth < 0`', () => {
      user.setData({ id: 1, firstName: 'foo', lastName: 'bar' });
      expect(user[util.inspect.custom](-1, {}), 'to be', 'User {}');
    });

    it('supports `colors`', () => {
      user.setData({ id: 1, firstName: 'foo', lastName: 'bar' });
      expect(
        user[util.inspect.custom](2, {
          colors: true,
          stylize: value => `${value}+color`
        }),
        'to start with',
        'User+color'
      );
    });
  });

  describe.only('Model.prototype.validate', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        id: { type: 'integer', validate: 'integer' },
        name: { type: 'string', validate: 'string' },
        confirmed: { type: 'boolean' }
      };
      user = new User();
    });

    it('validates all fields with a validation spec', async () => {
      user.setData({ id: 1, name: 'foo', confirmed: false });
      const Validate = sinon.spy(User, 'Validate');
      const validate = sinon.spy(User.Validate.prototype, 'validate');
      await user.validate();
      await expect(Validate, 'to have calls satisfying', () => {
        new Validate(user, User.fields.id); // eslint-disable-line no-new
        new Validate(user, User.fields.name); // eslint-disable-line no-new
      });
      await expect(validate, 'to have calls satisfying', () => {
        validate(1, 'integer');
        validate('foo', 'string');
      });
      Validate.restore();
      validate.restore();
    });

    it('rejects with the first validation error', async () => {
      user.setData({ id: 'foo', name: 1 });
      await expect(
        user.validate(),
        'to be rejected with error satisfying',
        'User.fields.id: expected an integer value'
      );
    });

    it('resolves with the Model instance', async () => {
      await expect(user.validate(), 'to be fulfilled with', user);
    });

    describe('when passed a list of fields to validate', () => {
      beforeEach(() => {
        user.setData({ id: 'foo', name: 1, confirmed: 'foo' });
      });

      it('validates only those fields', async () => {
        await expect(
          user.validate({ fields: ['name'] }),
          'to be rejected with error satisfying',
          'User.fields.name: expected a string value'
        );
      });

      it('skips fields with no default values configured', async () => {
        await expect(
          user.validate({ fields: ['confirmed'] }),
          'to be fulfilled'
        );
      });
    });
  });

  describe.only('Model.prototype.castValuesBeforeSave', () => {
    let User;
    let user;
    let castIdBeforeSave;
    let castNameBeforeSave;

    beforeEach(() => {
      castIdBeforeSave = sinon.stub().returns(10);
      castNameBeforeSave = sinon.stub();
      User = class extends Model {};
      User.fields = {
        id: { type: 'integer', castValueBeforeSave: castIdBeforeSave },
        name: { type: 'string', castValueBeforeSave: castNameBeforeSave },
        confirmed: { type: 'boolean' }
      };
      user = new User({ id: 1, name: 'foo', confirmed: false });
    });

    it('updates field values with the values returned by cast methods', () => {
      user.castValuesBeforeSave();
      expect(user.id, 'to be', 10);
    });

    it('does not cast `undefined` values', () => {
      user.id = undefined;
      user.castValuesBeforeSave();
      expect(user.id, 'to be undefined');
    });

    it('does not update a field value if a cast function returns `undefined`', () => {
      user.castValuesBeforeSave();
      expect(user.name, 'to be', 'foo');
    });

    it('calls the cast function with the model instance and the field value', () => {
      user.castValuesBeforeSave();
      expect(castIdBeforeSave, 'to have calls satisfying', () => {
        castIdBeforeSave(user, 1);
      });
    });

    it('casts all fields with a before-save cast function', () => {
      user.setData({ id: 1, name: 'foo', confirmed: false });
      user.castValuesBeforeSave();
      expect(castIdBeforeSave, 'to have calls satisfying', () => {
        castIdBeforeSave(user, 1);
      });
      expect(castNameBeforeSave, 'to have calls satisfying', () => {
        castNameBeforeSave(user, 'foo');
      });
    });

    it('resolves with the Model instance', () => {
      expect(user.castValuesBeforeSave(), 'to be', user);
    });

    describe('when passed a list of fields to cast', () => {
      it('casts only those fields', () => {
        user.castValuesBeforeSave({ fields: ['id'] });
        expect(user, 'to satisfy', { id: 10, name: 'foo', confirmed: false });
        expect(castNameBeforeSave, 'was not called');
      });

      it('skips fields with no before-save cast function configured', () => {
        user.castValuesBeforeSave({ fields: ['confirmed'] });
        expect(user, 'to satisfy', { id: 1, name: 'foo', confirmed: false });
      });
    });
  });

  describe.only('Model.prototype.castValuesAfterFetch', () => {
    let User;
    let user;
    let castIdAfterFetch;
    let castNameAfterFetch;

    beforeEach(() => {
      castIdAfterFetch = sinon.stub().returns(10);
      castNameAfterFetch = sinon.stub();
      User = class extends Model {};
      User.fields = {
        id: { type: 'integer', castValueAfterFetch: castIdAfterFetch },
        name: { type: 'string', castValueAfterFetch: castNameAfterFetch },
        confirmed: { type: 'boolean' }
      };
      user = new User({ id: 1, name: 'foo', confirmed: false });
    });

    it('updates field values with the values returned by cast methods', () => {
      user.castValuesAfterFetch();
      expect(user.id, 'to be', 10);
    });

    it('does not cast `undefined` values', () => {
      user.id = undefined;
      user.castValuesAfterFetch();
      expect(user.id, 'to be undefined');
    });

    it('does not update a field value if a cast function returns `undefined`', () => {
      user.castValuesAfterFetch();
      expect(user.name, 'to be', 'foo');
    });

    it('calls the cast function with the model instance and the field value', () => {
      user.castValuesAfterFetch();
      expect(castIdAfterFetch, 'to have calls satisfying', () => {
        castIdAfterFetch(user, 1);
      });
    });

    it('casts all fields with a before-save cast function', () => {
      user.setData({ id: 1, name: 'foo', confirmed: false });
      user.castValuesAfterFetch();
      expect(castIdAfterFetch, 'to have calls satisfying', () => {
        castIdAfterFetch(user, 1);
      });
      expect(castNameAfterFetch, 'to have calls satisfying', () => {
        castNameAfterFetch(user, 'foo');
      });
    });

    it('resolves with the Model instance', () => {
      expect(user.castValuesAfterFetch(), 'to be', user);
    });

    describe('when passed a list of fields to cast', () => {
      it('casts only those fields', () => {
        user.castValuesAfterFetch({ fields: ['id'] });
        expect(user, 'to satisfy', { id: 10, name: 'foo', confirmed: false });
        expect(castNameAfterFetch, 'was not called');
      });

      it('skips fields with no before-save cast function configured', () => {
        user.castValuesAfterFetch({ fields: ['confirmed'] });
        expect(user, 'to satisfy', { id: 1, name: 'foo', confirmed: false });
      });
    });
  });

  describe('Model.prototype.getQuery', () => {
    let Foo;
    let Query;

    before(() => {
      const orm = new Knorm();

      Query = orm.Query;
      Foo = class extends orm.Model {};

      Foo.table = 'foo';
      Foo.fields = {
        id: {
          type: 'integer',
          primary: true
        },
        name: {
          type: 'string'
        }
      };
    });

    it('passes any options passed to Query.prototype.setOptions', () => {
      const setOptions = sinon
        .stub(Query.prototype, 'setOptions')
        .returnsThis();
      new Foo({ id: 1 }).getQuery({ returning: 'name' });
      expect(setOptions, 'to have calls satisfying', () =>
        setOptions({ returning: 'name' })
      );
      setOptions.restore();
    });

    it('sets `first` to `true`', () => {
      const first = sinon.stub(Query.prototype, 'first').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(first, 'to have calls satisfying', () => first(true));
      first.restore();
    });

    it('sets `require` to `true` by default', () => {
      const require = sinon.stub(Query.prototype, 'require').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(require, 'to have calls satisfying', () => require(true));
      require.restore();
    });

    it('allows overriding the `require` option to `false`', () => {
      const require = sinon.stub(Query.prototype, 'require').returnsThis();
      new Foo({ id: 1 }).getQuery({ require: false });
      expect(require, 'to have calls satisfying', () => require(false));
      require.restore();
    });

    it('passes the primary field set on the model to Query.prototype.where', () => {
      const where = sinon.stub(Query.prototype, 'where').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(where, 'to have calls satisfying', () => where({ id: 1 }));
      where.restore();
    });

    it('throws if the primary field is not set', () => {
      expect(
        () => new Foo({}).getQuery(),
        'to throw',
        new Error('Foo: primary field (`id`) is not set')
      );
    });

    it('appends the `where` clause if a `where` option is passed', () => {
      const where = sinon.stub(Query.prototype, 'where').returnsThis();
      new Foo({ id: 1 }).getQuery({ where: { name: 'foo' } });
      expect(where, 'to have calls satisfying', () => {
        where({ name: 'foo' });
        where({ id: 1 });
      });
      where.restore();
    });

    describe('with unique fields configured', () => {
      let Foo;

      before(() => {
        Foo = class extends Model {};

        Foo.table = 'foo';
        Foo.fields = {
          id: {
            type: 'integer',
            primary: true
          },
          name: {
            type: 'string',
            unique: true
          },
          number: {
            type: 'integer',
            unique: true
          }
        };
      });

      let whereStub;

      before(() => {
        whereStub = sinon.stub(Query.prototype, 'where').returnsThis();
      });

      beforeEach(() => {
        whereStub.resetHistory();
      });

      after(() => {
        whereStub.restore();
      });

      it('uses the unique fields in a where clause if the primary field is not set', () => {
        new Foo({ name: 'foo' }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ name: 'foo' })
        );
      });

      it('uses the primary field if both unique and primary fields are set', () => {
        new Foo({ id: 1, name: 'foo' }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ id: 1 })
        );
      });

      it('uses only one of the primary fields if more than one are set', () => {
        new Foo({ name: 'foo', number: 1 }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ name: 'foo' })
        );
      });

      it('throws if neither the primary field nor unique fields are set', () => {
        expect(
          () => new Foo({}).getQuery(),
          'to throw',
          new Error('Foo: primary field (`id`) is not set')
        );
      });
    });

    describe('for inserts', () => {
      it('does not throw if the primary field is not set', () => {
        expect(
          () => new Foo({}).getQuery({}, { forInsert: true }),
          'not to throw'
        );
      });

      it('does not construct a `where` clause', () => {
        const where = sinon.stub(Query.prototype, 'where').returnsThis();
        new Foo({ id: 1 }).getQuery({}, { forInsert: true });
        expect(where, 'was not called');
        where.restore();
      });
    });
  });

  describe.only('Model.throwModelError', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('throws a ModelError', () => {
      expect(
        () => User.throwModelError('foo'),
        'to throw',
        new ModelError({ Model: User, message: 'foo' })
      );
    });
  });

  describe.only('Model.createField', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns a Field instance', () => {
      expect(
        User.createField({ name: 'id', type: 'integer' }),
        'to be a',
        Field
      );
    });

    it('binds the field to the Model', () => {
      expect(User.createField({ name: 'id', type: 'integer' }), 'to satisfy', {
        Model: User
      });
    });

    it('supports an overriden Model.Field class', () => {
      User.Field = sinon.spy();
      User.createField({ name: 'id', type: 'integer' });
      expect(
        User.Field,
        'to have calls satisfying',
        () => new User.Field(User, { name: 'id', type: 'integer' })
      );
    });

    describe('for field configs with `type` as `virtual`', () => {
      it('sets `virtual` to `true` for the field', () => {
        expect(
          User.createField({ name: 'id', type: 'virtual' }),
          'to satisfy',
          { virtual: true }
        );
      });
    });
  });

  describe.only('Model.getGeneratedMethodName', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns an upper camel-cased method name', () => {
      const field = new Field(User, { name: 'firstName', type: 'integer' });
      expect(User.getGeneratedMethodName(field), 'to be', 'FirstName');
    });

    it('handles underscores, hyphens and spaces in the field-name', () => {
      const field = new Field(User, {
        name: '__internal-group id',
        type: 'integer'
      });
      expect(User.getGeneratedMethodName(field), 'to be', 'InternalGroupId');
    });
  });

  describe.only('Model.getGeneratedMethodQuery', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
      Object.defineProperty(User, 'query', {
        value: {
          setOption: sinon.spy().named('setOption'),
          setOptions: sinon.spy().named('setOptions')
        }
      });
    });

    it('sets the `where` option', () => {
      const id = new Field(User, { name: 'id', type: 'integer' });
      User.getGeneratedMethodQuery(id, 1);
      expect(User.query.setOption, 'to have calls satisfying', () =>
        User.query.setOption('where', { id: 1 })
      );
    });

    it('sets the `first` and `require` options for primary fields', () => {
      const id = new Field(User, {
        name: 'id',
        type: 'integer',
        primary: true
      });
      User.getGeneratedMethodQuery(id, 1);
      expect(User.query.setOptions, 'to have calls satisfying', () =>
        User.query.setOptions({ first: true, require: true })
      );
    });

    it('sets the `first` and `require` options for unique fields', () => {
      const id = new Field(User, { name: 'id', type: 'integer', unique: true });
      User.getGeneratedMethodQuery(id, 1);
      expect(User.query.setOptions, 'to have calls satisfying', () =>
        User.query.setOptions({ first: true, require: true })
      );
    });

    it('allows overriding the `first` and `require` options', () => {
      const id = new Field(User, {
        name: 'id',
        type: 'integer',
        primary: true
      });
      User.getGeneratedMethodQuery(id, 1, { first: false, require: false });
      expect(User.query.setOptions, 'to have calls satisfying', () => {
        User.query.setOptions({ first: true, require: true });
        User.query.setOptions({ first: false, require: false });
      });
    });
  });

  describe.only('Model.addGeneratedMethods', () => {
    let User;
    let id;

    beforeEach(() => {
      User = class extends Model {};
      id = new Field(User, { name: 'id', type: 'integer' });
    });

    it('adds a `fetchByField` static method', () => {
      User.addGeneratedMethods(id);
      expect(User.fetchById, 'to be a function');
    });

    it('adds a `updateByField` static method', () => {
      User.addGeneratedMethods(id);
      expect(User.updateById, 'to be a function');
    });

    it('adds a `deleteByField` static method', () => {
      User.addGeneratedMethods(id);
      expect(User.deleteById, 'to be a function');
    });
  });

  describe.only('Model.addField', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('throws if the field-name is Model.prototype property', () => {
      expect(
        () =>
          User.addField(new Field(User, { name: 'getData', type: 'string' })),
        'to throw',
        new ModelError({
          Model: User,
          message: "field 'getData' conflicts with User.prototype.getData"
        })
      );
    });

    it('throws if the field-name is user-added Model.prototype property', () => {
      User = class extends Model {
        id() {}
      };
      expect(
        () => User.addField(new Field(User, { name: 'id', type: 'string' })),
        'to throw',
        new ModelError({
          Model: User,
          message: "field 'id' conflicts with User.prototype.id"
        })
      );
    });

    it('throws if the field-name is `$values`', () => {
      expect(
        () =>
          User.addField(new Field(User, { name: '$values', type: 'string' })),
        'to throw',
        new ModelError({
          Model: User,
          message: "field '$values' conflicts with User.prototype.$values"
        })
      );
    });

    it('throws if the field-name is `$config`', () => {
      expect(
        () =>
          User.addField(new Field(User, { name: '$config', type: 'string' })),
        'to throw',
        new ModelError({
          Model: User,
          message: "field '$config' conflicts with User.prototype.$config"
        })
      );
    });

    it("adds the field to the Model's fields", () => {
      User.addField(new Field(User, { name: 'id', type: 'integer' }));
      expect(User.fields, 'to equal', {
        id: new Field(User, { name: 'id', type: 'integer' })
      });
    });

    it("adds the field's to the Model's field-names", () => {
      User.addField(new Field(User, { name: 'id', type: 'integer' }));
      expect(User.config.fieldNames, 'to equal', ['id']);
    });

    describe('if the field is has validation', () => {
      it("adds it to the Model's validated fields", () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', validate: 'integer' })
        );
        expect(User.config.validated, 'to equal', ['id']);
      });
    });

    describe('if the field has no validation', () => {
      it("does not add it to the Model's validated fields", () => {
        User.addField(new Field(User, { name: 'id', type: 'integer' }));
        expect(User.config.validated, 'to be empty');
      });
    });

    describe('if the field is non-virtual', () => {
      it("adds it to the Model's columns", () => {
        User.addField(
          new Field(User, {
            name: 'id',
            type: 'integer',
            virtual: false,
            column: '_id'
          })
        );
        expect(User.config.columns, 'to equal', { id: '_id' });
      });
    });

    describe('if the field is virtual', () => {
      it("does not add it to the Model's columns", () => {
        User.addField(
          new Field(User, {
            name: 'id',
            type: 'integer',
            virtual: true,
            column: '_id'
          })
        );
        expect(User.config.columns, 'to be empty');
      });
    });

    describe('if the field is primary', () => {
      it("sets it as the Model's primary field", () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', primary: true })
        );
        expect(User.config.primary, 'to be', 'id');
      });
    });

    describe('if the field is non-primary', () => {
      it("does not set it as the Model's primary field", () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', primary: false })
        );
        expect(User.config.primary, 'to be undefined');
      });
    });

    describe('if the field is not updated', () => {
      it("adds it to the Model's not-updated fields", () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', updated: false })
        );
        expect(User.config.notUpdated, 'to equal', ['id']);
      });
    });

    describe('if the field is updated', () => {
      it("does not add it to the Model's not-updated fields", () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', updated: true })
        );
        expect(User.config.notUpdated, 'to be empty');
      });
    });

    describe('if the field is unique', () => {
      it("adds it to the Model's unique fields", () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', unique: true })
        );
        expect(User.config.unique, 'to equal', ['id']);
      });
    });

    describe('if the field is not unique', () => {
      it("does not add it to the Model's unique fields", () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', unique: false })
        );
        expect(User.config.unique, 'to be empty');
      });
    });

    describe('if the field has a default', () => {
      it("adds it to the Model's default fields", () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', default: 1 })
        );
        expect(User.config.defaults, 'to equal', ['id']);
      });

      it('supports falsy defaults', () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', default: 0 })
        );
        expect(User.config.defaults, 'to equal', ['id']);
      });
    });

    describe('if the field has no default', () => {
      it("does not add it to the Model's default fields", () => {
        User.addField(new Field(User, { name: 'id', type: 'integer' }));
        expect(User.config.defaults, 'to be empty');
      });
    });

    describe('if the field has a before-save cast function', () => {
      it('adds it to the fields with before-save cast functions', () => {
        User.addField(
          new Field(User, {
            name: 'id',
            type: 'integer',
            castValueBeforeSave: () => {}
          })
        );
        expect(User.config.castBeforeSave, 'to equal', ['id']);
      });
    });

    describe('if the field has no before-save cast function', () => {
      it('does not add it to the fields with before-save cast functions', () => {
        User.addField(new Field(User, { name: 'id', type: 'integer' }));
        expect(User.config.castBeforeSave, 'to be empty');
      });
    });

    describe('if the field has an after-fetch cast function', () => {
      it('adds it to the fields with after-fetch cast functions', () => {
        User.addField(
          new Field(User, {
            name: 'id',
            type: 'integer',
            castValueAfterFetch: () => {}
          })
        );
        expect(User.config.castAfterFetch, 'to equal', ['id']);
      });
    });

    describe('if the field has no after-fetch cast function', () => {
      it('does not add it to the fields with after-fetch cast functions', () => {
        User.addField(new Field(User, { name: 'id', type: 'integer' }));
        expect(User.config.castAfterFetch, 'to be empty');
      });
    });

    describe('if the field enables generated methods', () => {
      it('adds generated methods to the Model', () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', methods: true })
        );
        expect(User.fetchById, 'to be a function');
        expect(User.updateById, 'to be a function');
        expect(User.deleteById, 'to be a function');
      });
    });

    describe('if the field does not enable generated methods', () => {
      it('does not add generated methods to the Model', () => {
        User.addField(
          new Field(User, { name: 'id', type: 'integer', methods: false })
        );
        expect(User.fetchById, 'to be undefined');
        expect(User.updateById, 'to be undefined');
        expect(User.deleteById, 'to be undefined');
      });
    });
  });

  describe.only('Model.removeGeneratedMethods', () => {
    let User;
    let id;

    beforeEach(() => {
      User = class extends Model {};
      id = new Field(User, { name: 'id', type: 'integer' });
      User.addGeneratedMethods(id);
    });

    it('removes the `fetchByField` static method', () => {
      User.removeGeneratedMethods(id);
      expect(User.fetchById, 'to be undefined');
    });

    it('removes the `updateByField` static method', () => {
      User.removeGeneratedMethods(id);
      expect(User.updateById, 'to be undefined');
    });

    it('removes the `deleteByField` static method', () => {
      User.removeGeneratedMethods(id);
      expect(User.deleteById, 'to be undefined');
    });
  });

  describe.only('Model.removeField', () => {
    let User;
    let id;

    beforeEach(() => {
      User = class extends Model {};
      id = new Field(User, { name: 'id', type: 'integer' });
    });

    it('throws if the field does not exist on the Model', () => {
      expect(
        () => User.removeField(id),
        'to throw',
        new ModelError({ Model: User, message: "unkown field 'id'" })
      );
    });

    it('throws if a different field by the same name is passed', () => {
      User.addField(id);
      expect(
        () =>
          User.removeField(new Field(User, { name: 'id', type: 'integer' })),
        'to throw',
        new ModelError({ Model: User, message: "unkown field 'id'" })
      );
    });

    it("removes the field from the Model's fields", () => {
      User.addField(id);
      User.removeField(id);
      expect(User.fields, 'to be empty');
    });

    it("removes the field from the Model's field-names", () => {
      User.addField(id);
      User.removeField(id);
      expect(User.config.fieldNames, 'to be empty');
    });

    describe('if the field has validation', () => {
      beforeEach(() => {
        id = new Field(User, {
          name: 'id',
          type: 'integer',
          validate: 'integer'
        });
      });

      it("removes it from the Model's validated fields", () => {
        User.addField(id);
        User.removeField(id);
        expect(User.config.validated, 'to be empty');
      });
    });

    describe('if the field is non-virtual', () => {
      beforeEach(() => {
        id = new Field(User, {
          name: 'id',
          type: 'integer',
          virtual: false,
          column: '_id'
        });
      });

      it("removes it from the Model's columns", () => {
        User.addField(id);
        User.removeField(id);
        expect(User.config.columns, 'to be empty');
      });
    });

    describe('if the field is primary', () => {
      beforeEach(() => {
        id = new Field(User, { name: 'id', type: 'integer', primary: true });
      });

      it("unsets it as the Model's primary field", () => {
        User.addField(id);
        User.removeField(id);
        expect(User.config.primary, 'to be undefined');
      });
    });

    describe('if the field is not updated', () => {
      beforeEach(() => {
        id = new Field(User, { name: 'id', type: 'integer', updated: false });
      });

      it("removes it from the Model's not-updated fields", () => {
        User.addField(id);
        User.removeField(id);
        expect(User.config.notUpdated, 'to be empty');
      });
    });

    describe('if the field is unique', () => {
      beforeEach(() => {
        id = new Field(User, { name: 'id', type: 'integer', unique: true });
      });

      it("removes it from the Model's unique fields", () => {
        User.addField(id);
        User.removeField(id);
        expect(User.config.unique, 'to be empty');
      });
    });

    describe('if the field has a default', () => {
      beforeEach(() => {
        id = new Field(User, { name: 'id', type: 'integer', default: 1 });
      });

      it("removes it from the Model's default fields", () => {
        User.addField(id);
        User.removeField(id);
        expect(User.config.defaults, 'to be empty');
      });

      it('supports falsy defaults', () => {
        id = new Field(User, { name: 'id', type: 'integer', default: 0 });
        User.addField(id);
        User.removeField(id);
        expect(User.config.defaults, 'to be empty');
      });
    });

    describe('if the field has a before-save cast function', () => {
      beforeEach(() => {
        id = new Field(User, {
          name: 'id',
          type: 'integer',
          castValueBeforeSave: () => {}
        });
      });

      it('removes it from the fields with before-save cast functions', () => {
        User.addField(id);
        User.removeField(id);
        expect(User.config.castBeforeSave, 'to be empty');
      });
    });

    describe('if the field has an after-fetch cast function', () => {
      beforeEach(() => {
        id = new Field(User, {
          name: 'id',
          type: 'integer',
          castValueAfterFetch: () => {}
        });
      });

      it('removes it from the fields with after-fetch cast functions', () => {
        User.addField(id);
        User.removeField(id);
        expect(User.config.castAfterFetch, 'to be empty');
      });
    });

    describe('if the field enables generated methods', () => {
      beforeEach(() => {
        id = new Field(User, { name: 'id', type: 'integer', methods: true });
      });
      it('removes generated methods from the Model', () => {
        User.addField(id);
        User.removeField(id);
        expect(User.fetchById, 'to be undefined');
        expect(User.updateById, 'to be undefined');
        expect(User.deleteById, 'to be undefined');
      });
    });
  });

  describe.only('Model.getDefaultConfig', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns the Model', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { Model: User });
    });

    it('returns default options', () => {
      expect(User.getDefaultConfig(), 'to satisfy', {
        options: { query: { debug: undefined } }
      });
    });

    it('returns empty fields', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { fields: {} });
    });

    it('returns empty field-names', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { fieldNames: [] });
    });

    it('returns empty columns', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { columns: {} });
    });

    it('returns no primary field', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { primary: undefined });
    });

    it('returns empty unique fields', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { unique: [] });
    });

    it('returns empty not-updated fields', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { notUpdated: [] });
    });

    it('returns empty default fields', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { defaults: [] });
    });

    it('returns empty fields with before-save cast functions', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { castBeforeSave: [] });
    });

    it('returns empty fields with after-fetch cast functions', () => {
      expect(User.getDefaultConfig(), 'to satisfy', { castAfterFetch: [] });
    });
  });

  describe.only('Model.setupConfig', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it("sets the Model's default config", () => {
      User.setupConfig();
      expect(User._config, 'to satisfy', User.getDefaultConfig());
    });

    describe('when a Model is subclassed', () => {
      let Student;

      beforeEach(() => {
        User.schema = 'users';
        User.table = 'user';
        User.fields = { id: 'integer' };
        User.options = { query: { field: 'id' } };
        Student = class extends User {};
        Student.setupConfig();
      });

      it('inherits `schema`', () => {
        expect(Student._config.schema, 'to be', 'users');
      });

      it('inherits `table`', () => {
        expect(Student._config.table, 'to be', 'user');
      });

      it('inherits `fields`', () => {
        expect(Student._config.fields, 'to satisfy', {
          id: new Field(Student, { name: 'id', type: 'integer' })
        });
      });

      it('inherits `options`', () => {
        expect(Student._config.options, 'to equal', {
          query: { debug: undefined, field: 'id' }
        });
      });

      it('does not inherit `Model`', () => {
        expect(Student._config.Model, 'to be', Student);
      });

      it('leaves the parent config as is', () => {
        expect(User._config, 'to satisfy', {
          Model: User,
          schema: 'users',
          table: 'user',
          fields: { id: new Field(User, { name: 'id', type: 'integer' }) },
          options: { query: { debug: undefined, field: 'id' } }
        });
      });
    });
  });

  describe.only('Model.config', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    describe('if the Model is not configured', () => {
      it('returns the default config', () => {
        expect(User.config, 'to satisfy', User.getDefaultConfig());
      });
    });

    describe('if the Model is configured', () => {
      it("returns the set Model's config", () => {
        User.table = 'user';
        expect(
          User.config,
          'to exhaustively satisfy',
          Object.assign(User.getDefaultConfig(), { table: 'user' })
        );
      });
    });
  });

  describe.only('Model.schema', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns `undefined`', () => {
      expect(User.schema, 'to be undefined');
    });

    it('allows setting and getting `schema`', () => {
      User.schema = 'users';
      expect(User.schema, 'to be', 'users');
    });

    it('allows ovewriting `schema`', () => {
      User.schema = 'users';
      User.schema = 'foo';
      expect(User.schema, 'to be', 'foo');
    });
  });

  describe.only('Model.table', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns `undefined`', () => {
      expect(User.table, 'to be undefined');
    });

    it('allows setting and getting `table`', () => {
      User.table = 'user';
      expect(User.table, 'to be', 'user');
    });

    it('allows ovewriting `table`', () => {
      User.table = 'user';
      User.table = 'foo';
      expect(User.table, 'to be', 'foo');
    });
  });

  describe.only('Model.options', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns the default options', () => {
      expect(User.options, 'to equal', { query: { debug: undefined } });
    });

    it('allows adding `query` options', () => {
      User.options = { query: { field: 'id' } };
      expect(User.options, 'to equal', {
        query: { debug: undefined, field: 'id' }
      });
      User.options = { query: { where: { id: 1 } } };
      expect(User.options, 'to equal', {
        query: { debug: undefined, field: 'id', where: { id: 1 } }
      });
    });

    it('allows adding `plugins` options', () => {
      User.options = { plugins: { toJSON: { exclude: ['id'] } } };
      expect(User.options, 'to equal', {
        query: { debug: undefined },
        plugins: { toJSON: { exclude: ['id'] } }
      });
    });

    it('merges options', () => {
      User.options = { query: { where: { id: 1 } } };
      expect(User.options, 'to equal', {
        query: { debug: undefined, where: { id: 1 } }
      });
      User.options = {
        query: { where: { name: 'foo' } }
      };
      expect(User.options, 'to equal', {
        query: { debug: undefined, where: { id: 1, name: 'foo' } }
      });
    });

    it('does not modify the object passed', () => {
      const options = { query: { where: { id: 1 } } };
      User.options = options;
      expect(User.options, 'to equal', {
        query: { debug: undefined, where: { id: 1 } }
      });
      expect(options, 'to equal', { query: { where: { id: 1 } } });
    });

    it('allows overwriting options', () => {
      User.options = { query: { where: { id: 1 } } };
      expect(User.options, 'to equal', {
        query: { debug: undefined, where: { id: 1 } }
      });
      User.options = {
        query: { where: { id: [1] } }
      };
      expect(User.options, 'to equal', {
        query: { debug: undefined, where: { id: [1] } }
      });
    });
  });

  describe.only('Model.fields', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns an empty object', () => {
      expect(User.fields, 'to equal', {});
    });

    it('allows setting and getting `fields`', () => {
      User.fields = { id: { type: 'integer' } };
      expect(User.fields, 'to equal', {
        id: new Field(User, { name: 'id', type: 'integer' })
      });
    });

    it('allows setting fields via the `type` shorthand', () => {
      User.fields = { id: 'integer' };
      expect(User.fields, 'to equal', {
        id: new Field(User, { name: 'id', type: 'integer' })
      });
    });

    it('allows setting fields via Field instances', () => {
      User.fields = { id: new Field(User, { name: 'id', type: 'integer' }) };
      expect(User.fields, 'to equal', {
        id: new Field(User, { name: 'id', type: 'integer' })
      });
    });

    it('overwrites the `name` property in a field config', () => {
      User.fields = { id: { type: 'integer', name: 'foo' } };
      expect(User.fields, 'to equal', {
        id: new Field(User, { name: 'id', type: 'integer' })
      });
    });

    it('allows adding fields', () => {
      User.fields = { id: 'integer' };
      expect(User.fields, 'to satisfy', {
        id: new Field(User, { name: 'id', type: 'integer' })
      });
      User.fields = { name: 'string' };
      expect(User.fields, 'to satisfy', {
        id: new Field(User, { name: 'id', type: 'integer' }),
        name: new Field(User, { name: 'name', type: 'string' })
      });
    });

    it('allows overwriting fields', () => {
      User.fields = { id: { type: 'integer', primary: true } };
      expect(User.config, 'to satisfy', {
        fields: {
          id: new Field(User, { name: 'id', type: 'integer', primary: true })
        },
        primary: 'id',
        fieldNames: ['id']
      });
      User.fields = { id: { type: 'string' } };
      expect(User.config, 'to satisfy', {
        fields: { id: new Field(User, { name: 'id', type: 'string' }) },
        primary: undefined,
        fieldNames: ['id']
      });
    });
  });

  describe.only('Model.query', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
      User.options = { query: { fields: ['id'], where: { id: 1 } } };
    });

    it('returns a Query instance', () => {
      expect(User.query, 'to be a', Query);
    });

    it('configures the Query instance with the model', () => {
      User.Query = sinon.stub().returns({ setOptions() {} });
      // eslint-disable-next-line no-unused-expressions
      User.query;
      expect(User.Query, 'to have calls satisfying', () => {
        // eslint-disable-next-line no-new
        new User.Query(expect.it('to be model class', User));
      });
    });

    it('sets configured default query options on the instance', () => {
      expect(User.query, 'to satisfy', {
        options: { fields: { id: 'id' }, where: [[{ id: 1 }]] }
      });
    });
  });

  describe('Model.where', () => {
    let User;

    before(() => {
      User = class extends Model {};
    });

    it('returns a `Query.Where` instance', () => {
      expect(User.where, 'to be a', Query.Where);
    });
  });

  describe('for db operations', () => {
    let Model;
    let Query;
    let User;

    before(() => {
      ({ Model, Query } = new Knorm().use(postgresPlugin));

      User = class extends Model {};

      User.table = 'user';
      User.fields = {
        id: {
          type: 'integer',
          required: true,
          primary: true,
          methods: true
        },
        name: {
          type: 'string',
          required: true
        }
      };
    });

    before(async () => knex.schema.dropTableIfExists(User.table));

    before(async () =>
      knex.schema.createTable(User.table, table => {
        table.increments();
        table.string('name').notNullable();
      })
    );

    after(async () => knex.schema.dropTable(User.table));

    afterEach(async () => knex(User.table).truncate());

    describe('Model.prototype.save', () => {
      it('inserts a model if its primary field is not set', async () => {
        const user = new User({ name: 'John Doe' });
        await expect(
          user.save(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });

      it('updates a model if its primary field is set', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.save(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'Jane Doe' })
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });

      it('passes options along', async () => {
        const insert = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.resolve([]));
        const user = new User({ name: 'John Doe' });
        await expect(
          user.save({ require: false }),
          'to be fulfilled with value satisfying',
          null
        );
        insert.restore();
      });
    });

    describe('Model.prototype.insert', () => {
      it('inserts a model', async () => {
        const user = new User({ name: 'John Doe' });
        await expect(
          user.insert(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });

      it('passes options along', async () => {
        const insert = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.resolve([]));
        const user = new User({ name: 'John Doe' });
        await expect(
          user.insert({ require: false }),
          'to be fulfilled with value satisfying',
          null
        );
        insert.restore();
      });

      it('resolves with the same instance that was passed', async () => {
        const user = await new User({ name: 'John Doe' });
        user.name = 'Jane Doe';
        user.leaveMeIntact = 'okay';
        await expect(
          user.insert(),
          'to be fulfilled with value satisfying',
          expect.it('to be', user).and('to satisfy', { leaveMeIntact: 'okay' })
        );
      });

      it('casts fields with `forFetch` cast functions', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          name: {
            type: 'string',
            cast: {
              forFetch() {
                return 'cast name';
              }
            }
          }
        };
        await expect(
          new OtherUser({ name: 'John Doe' }).insert(),
          'to be fulfilled with value satisfying',
          new OtherUser({ name: 'cast name' })
        );
      });
    });

    describe('Model.prototype.update', () => {
      it('updates a model', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.update(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'Jane Doe' })
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });

      it('passes options along', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.update({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });

      it('resolves with the same instance that was passed', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        user.leaveMeIntact = 'okay';
        await expect(
          user.update(),
          'to be fulfilled with value satisfying',
          expect.it('to be', user).and('to satisfy', { leaveMeIntact: 'okay' })
        );
      });

      it('casts fields with `forFetch` cast functions', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          name: {
            type: 'string',
            cast: {
              forFetch() {
                return 'cast name';
              }
            }
          }
        };
        const user = await new OtherUser({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.update(),
          'to be fulfilled with value satisfying',
          new OtherUser({ name: 'cast name' })
        );
      });
    });

    describe('Model.prototype.fetch', () => {
      it('fetches a model', async () => {
        await new User({ id: 1, name: 'John Doe' }).insert();
        const user = new User({ id: 1 });
        await expect(
          user.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
      });

      it('passes options along', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.fetch({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });

      it('casts fields with `forFetch` cast functions', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          name: {
            type: 'string',
            cast: {
              forFetch() {
                return 'cast name';
              }
            }
          }
        };
        const user = await new OtherUser({ name: 'John Doe' }).insert();
        await expect(
          user.fetch(),
          'to be fulfilled with value satisfying',
          new OtherUser({ name: 'cast name' })
        );
      });
    });

    describe('Model.prototype.delete', () => {
      it('deletes a model', async () => {
        await new User({ id: 1, name: 'John Doe' }).insert();
        const user = new User({ id: 1 });
        await expect(
          user.delete(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('passes options along', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        await expect(
          user.delete({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });

      it('casts fields with `forFetch` cast functions', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          name: {
            type: 'string',
            cast: {
              forFetch() {
                return 'cast name';
              }
            }
          }
        };
        const user = await new OtherUser({ name: 'John Doe' }).insert();
        await expect(
          user.delete(),
          'to be fulfilled with value satisfying',
          new OtherUser({ name: 'cast name' })
        );
      });
    });

    describe('Model.save', () => {
      it('inserts models', async () => {
        await expect(
          User.save({ name: 'John Doe' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });

      it('updates models', async () => {
        await User.insert({ name: 'John Doe' });
        await expect(
          User.save({ id: 1, name: 'Jane Doe' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'Jane Doe' })]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });

      it('passes options along', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.save({ id: 1, name: 'Jane Doe' }, { returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('Model.insert', () => {
      it('inserts models', async () => {
        await expect(
          User.insert({ id: 1, name: 'John Doe' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });

      it('passes options along', async () => {
        await expect(
          User.insert({ name: 'John Doe' }, { returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('Model.update', () => {
      it('updates models', async () => {
        await new User({ name: 'John Doe' }).insert();
        await expect(
          User.update({ name: 'Jane Doe' }),
          'to be fulfilled with value satisfying',
          [new User({ id: 1, name: 'Jane Doe' })]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });

      it('passes options along', async () => {
        await new User({ name: 'John Doe' }).insert();
        await expect(
          User.update({ id: 1, name: 'Jane Doe' }, { returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('Model.fetch', () => {
      it('fetches models', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
      });

      it('passes options along', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.fetch({ returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('Model.delete', () => {
      it('deletes models', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.delete(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
      });

      it('passes options along', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.delete({ returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('with `methods` configured', () => {
      beforeEach(async () => new User({ id: 1, name: 'John Doe' }).insert());

      describe('Model.fetchByField', () => {
        it('fetches a model using the field', async () => {
          await expect(
            User.fetchById(1),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'John Doe' })
          );
        });

        it('passes options along', async () => {
          await expect(
            User.fetchById(1, { where: { name: 'foo' } }),
            'to be rejected with error satisfying',
            { name: 'NoRowsFetchedError' }
          );
        });
      });

      describe('Model.deleteByField', () => {
        it('deletes a model using its primary field value', async () => {
          await expect(
            User.deleteById(1),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'John Doe' })
          );
          await expect(knex, 'with table', User.table, 'to be empty');
        });

        it('passes options along', async () => {
          await expect(
            User.deleteById(1, { where: { name: 'foo' } }),
            'to be rejected with error satisfying',
            { name: 'NoRowsDeletedError' }
          );
        });
      });

      describe('Model.updateByField', () => {
        it('updates a model using its primary field value', async () => {
          await expect(
            User.updateById(1, { name: 'Jane Doe' }),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'Jane Doe' })
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have rows satisfying',
            [{ id: 1, name: 'Jane Doe' }]
          );
        });

        it('passes options along', async () => {
          await expect(
            User.updateById(
              1,
              { name: 'Jane Doe' },
              { where: { name: 'foo' } }
            ),
            'to be rejected with error satisfying',
            { name: 'NoRowsUpdatedError' }
          );
        });
      });
    });
  });
});
