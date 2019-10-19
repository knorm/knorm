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
      User.fields = ['id'];
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
          User.fields = { confirmed: { getValue, setValue } };
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
        User.fields = { name: { virtual: true, getValue, setValue } };
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
          User.fields = { confirmed: { virtual: true } };
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
      let setValues;

      beforeEach(() => {
        setValues = sinon.spy(User.prototype, 'setValues');
      });

      afterEach(() => {
        setValues.restore();
      });

      it('calls Model.prototype.setValues with the data', () => {
        new User({ id: 1 }); // eslint-disable-line no-new
        expect(setValues, 'to have calls satisfying', () =>
          setValues({ id: 1 })
        );
      });
    });
  });

  describe.only('Model.prototype.setValues', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        firstName: {},
        lastName: {},
        fullName: {
          virtual: true,
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
          virtual: true,
          getValue(model) {
            return model.firstName[0] + model.lastName[0];
          }
        }
      };
      user = new User();
    });

    it('sets values for database fields', () => {
      user.setValues({ firstName: 'foo', lastName: 'bar' });
      expect(user.firstName, 'to be', 'foo');
      expect(user.lastName, 'to be', 'bar');
    });

    it('sets values for virtual fields', () => {
      user.setValues({ fullName: 'foo bar' });
      expect(user.firstName, 'to be', 'foo');
      expect(user.lastName, 'to be', 'bar');
    });

    it('sets values for arbitrary fields', () => {
      user.setValues({ foo: 'foo' });
      expect(user.foo, 'to be', 'foo');
    });

    it('returns the Model instance', () => {
      expect(user.setValues({ firstName: 1 }), 'to be', user);
    });

    it('does not set `undefined` values', () => {
      user.setValues({ firstName: 'foo' });
      user.setValues({ firstName: undefined });
      expect(user.firstName, 'to be', 'foo');
    });

    // https://github.com/knorm/knorm/issues/239
    it('does not set virtuals with no `setValue` function', () => {
      user.setValues({ firstName: 'foo', lastName: 'bar' });
      expect(user.initials, 'to be', 'fb');
      user.setValues({ initials: 'foo' });
      expect(user.initials, 'to be', 'fb');
    });

    it('does not allow overwriting $values', () => {
      expect(
        () =>
          user.setValues({ $values: { firstName: 'foo', lastName: 'bar' } }),
        'to throw',
        new TypeError(
          `Cannot assign to read only property '$values' of object '#<User>'`
        )
      );
    });

    it('does not allow overwriting $config', () => {
      expect(
        () => user.setValues({ $config: { foo: 'bar' } }),
        'to throw',
        new TypeError(
          `Cannot assign to read only property '$config' of object '#<User>'`
        )
      );
    });
  });

  describe.only('Model.prototype.getValues', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        firstName: {},
        lastName: {},
        fullName: {
          virtual: true,
          setValue(model, fullName) {
            fullName = fullName.split(' ');
            model.firstName = fullName[0];
            model.lastName = fullName[1];
          }
        },
        initials: {
          virtual: true,
          getValue(model) {
            return model.firstName[0] + model.lastName[0];
          }
        }
      };
      user = new User();
      user.setValues({ firstName: 'foo', lastName: 'bar' });
    });

    it('returns values for database fields', () => {
      expect(user.getValues(), 'to satisfy', {
        firstName: 'foo',
        lastName: 'bar'
      });
    });

    it('returns values for virtual fields', () => {
      expect(user.getValues(), 'to satisfy', { initials: 'fb' });
    });

    it('returns values for arbitrary fields', () => {
      user.setValues({ foo: 'foo' });
      expect(user.getValues(), 'to satisfy', { foo: 'foo' });
    });

    it('allows specifying fields whose values to return', () => {
      expect(
        user.getValues({ fields: ['firstName', 'initials'] }),
        'to equal',
        {
          firstName: 'foo',
          initials: 'fb'
        }
      );
    });

    it('returns values for directly assigned fields', () => {
      user.foo = 'foo';
      expect(user.getValues(), 'to satisfy', { foo: 'foo' });
    });

    it('does not return `undefined` values', () => {
      user.foo = undefined;
      expect(user.getValues(), 'not to have key', 'foo');
    });

    it('does not return values for virtuals with no `getValue` function', () => {
      expect(user.getValues(), 'not to have key', 'fullName');
    });

    it('does not include $values', () => {
      expect(user.getValues(), 'not to have key', '$values');
    });

    it('does not include $config', () => {
      expect(user.getValues(), 'not to have key', '$config');
    });
  });

  describe.only('Model.prototype.setDefaultValues', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        id: {},
        name: { default: 'foo' },
        confirmed: { default: false }
      };
      user = new User();
    });

    it('sets values for fields with defaults configured', async () => {
      await user.setDefaultValues();
      expect(user.name, 'to be', 'foo');
    });

    it('sets values for fields configured with falsy defaults', async () => {
      await user.setDefaultValues();
      expect(user.confirmed, 'to be false');
    });

    it('does not set values for fields with no defaults configured', async () => {
      await user.setDefaultValues();
      expect(user.id, 'to be undefined');
    });

    it('does not overwrite fields with values already set', async () => {
      user.name = 'bar';
      await user.setDefaultValues();
      expect(user.name, 'to be', 'bar');
    });

    it('resolves with the Model instance', async () => {
      await expect(user.setDefaultValues(), 'to be fulfilled with', user);
    });

    describe('when passed a list of fields to set defaults for', () => {
      it('sets defaults for only those fields', async () => {
        await user.setDefaultValues({ fields: ['name'] });
        expect(user, 'to satisfy', {
          name: 'foo',
          confirmed: expect.it('to be undefined')
        });
      });

      it('skips fields with no default values configured', async () => {
        await user.setDefaultValues({ fields: ['id', 'name'] });
        expect(user, 'to satisfy', {
          id: expect.it('to be undefined'),
          name: 'foo'
        });
      });
    });

    describe('for fields configured with a default-value function', () => {
      let User;
      let user;
      let getId;
      let getName;

      beforeEach(() => {
        getId = sinon.stub().returns(10);
        getName = sinon.stub().resolves('foo');
        User = class extends Model {};
        User.fields = {
          id: { default: getId },
          name: { default: getName }
        };
        user = new User();
      });

      it("sets the field value from the function's return value", async () => {
        await user.setDefaultValues();
        expect(user.id, 'to be', 10);
      });

      it('supports async default function', async () => {
        await user.setDefaultValues();
        expect(user.name, 'to be', 'foo');
      });

      it("passes the Model instance as the function's first parameter", async () => {
        await user.setDefaultValues();
        await expect(getId, 'to have calls satisfying', () => {
          getId(user);
        });
      });
    });
  });

  describe.only('Model.prototpye[util.inspect.custom]', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        id: {},
        firstName: {},
        lastName: {},
        fullName: {
          virtual: true,
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
      user.setValues({ id: 1, firstName: 'foo', lastName: 'bar' });
      expect(
        user[util.inspect.custom](2, {}),
        'to be',
        "User { id: 1, firstName: 'foo', lastName: 'bar', fullName: 'foo bar' }"
      );
    });

    it('inspects instances with custom data', () => {
      user.setValues({ foo: 'bar' });
      expect(user[util.inspect.custom](2, {}), 'to be', "User { foo: 'bar' }");
    });

    it('supports `depth < 0`', () => {
      user.setValues({ id: 1, firstName: 'foo', lastName: 'bar' });
      expect(user[util.inspect.custom](-1, {}), 'to be', 'User {}');
    });

    it('supports `colors`', () => {
      user.setValues({ id: 1, firstName: 'foo', lastName: 'bar' });
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

  describe.only('Model.prototype.validateValues', () => {
    let User;
    let user;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = {
        id: { validate: 'integer' },
        name: { validate: 'string' },
        confirmed: {}
      };
      user = new User();
    });

    it('validates all fields with a validation spec', async () => {
      user.setValues({ id: 1, name: 'foo', confirmed: false });
      const Validate = sinon.spy(User, 'Validate');
      const validate = sinon.spy(User.Validate.prototype, 'validate');
      await user.validateValues();
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
      user.setValues({ id: 'foo', name: 1 });
      await expect(
        user.validateValues(),
        'to be rejected with error satisfying',
        'User.fields.id: value should be an integer'
      );
    });

    it('resolves with the Model instance', async () => {
      await expect(user.validateValues(), 'to be fulfilled with', user);
    });

    describe('when passed a list of fields to validate', () => {
      beforeEach(() => {
        user.setValues({ id: 'foo', name: 1, confirmed: 'foo' });
      });

      it('validates only those fields', async () => {
        await expect(
          user.validateValues({ fields: ['name'] }),
          'to be rejected with error satisfying',
          'User.fields.name: value should be a string'
        );
      });

      it('skips fields with no default values configured', async () => {
        await expect(
          user.validateValues({ fields: ['confirmed'] }),
          'to be fulfilled'
        );
      });
    });
  });

  describe.only('Model.prototype.preparedValues', () => {
    let User;
    let user;
    let prepareId;
    let prepareName;

    beforeEach(() => {
      prepareId = sinon.stub().returns(10);
      prepareName = sinon.stub();
      User = class extends Model {};
      User.fields = {
        id: { prepareValue: prepareId },
        name: { prepareValue: prepareName },
        confirmed: {}
      };
      user = new User({ id: 1, name: 'foo', confirmed: false });
    });

    it('updates field values with the values returned by prepare-value functions', async () => {
      await user.prepareValues();
      expect(user.id, 'to be', 10);
    });

    it('supports async prepare-value functions', async () => {
      class Student extends Model {}
      Student.fields = { id: { prepareValue: async () => 100 } };
      const student = new Student({ id: 1 });
      await student.prepareValues();
      expect(student.id, 'to be', 100);
    });

    it('does not prepare `undefined` values', async () => {
      user.id = undefined;
      await user.prepareValues();
      expect(user.id, 'to be undefined');
    });

    it('does not update a field value if a prepare-vale function returns `undefined`', async () => {
      await user.prepareValues();
      expect(user.name, 'to be', 'foo');
    });

    it('calls the prepare function with the model instance and the field value', async () => {
      await user.prepareValues();
      expect(prepareId, 'to have calls satisfying', () => {
        prepareId(user, 1);
      });
    });

    it('prepares all fields with a prepare-value function', async () => {
      user.setValues({ id: 1, name: 'foo', confirmed: false });
      await user.prepareValues();
      expect(prepareId, 'to have calls satisfying', () => {
        prepareId(user, 1);
      });
      expect(prepareName, 'to have calls satisfying', () => {
        prepareName(user, 'foo');
      });
    });

    it('resolves with the Model instance', async () => {
      await expect(user.prepareValues(), 'to be fulfilled with', user);
    });

    describe('when passed a list of fields whose values to prepare', () => {
      it('prepares only those field values', async () => {
        await user.prepareValues({ fields: ['id'] });
        expect(user, 'to satisfy', { id: 10, name: 'foo', confirmed: false });
        expect(prepareName, 'was not called');
      });

      it('skips fields with no prepare-value function configured', async () => {
        await user.prepareValues({ fields: ['confirmed'] });
        expect(user, 'to satisfy', { id: 1, name: 'foo', confirmed: false });
      });
    });
  });

  describe.only('Model.prototype.parseValues', () => {
    let User;
    let user;
    let parseId;
    let parseName;

    beforeEach(() => {
      parseId = sinon.stub().returns(10);
      parseName = sinon.stub();
      User = class extends Model {};
      User.fields = {
        id: { parseValue: parseId },
        name: { parseValue: parseName },
        confirmed: {}
      };
      user = new User({ id: 1, name: 'foo', confirmed: false });
    });

    it('updates field values with the values returned by parse functions', async () => {
      await user.parseValues();
      expect(user.id, 'to be', 10);
    });

    it('supports async parse-value functions', async () => {
      class Student extends Model {}
      Student.fields = { id: { parseValue: async () => 100 } };
      const student = new Student({ id: 1 });
      await student.parseValues();
      expect(student.id, 'to be', 100);
    });

    it('does not parse `undefined` values', async () => {
      user.id = undefined;
      await user.parseValues();
      expect(user.id, 'to be undefined');
    });

    it('does not update a field value if a parse function returns `undefined`', async () => {
      await user.parseValues();
      expect(user.name, 'to be', 'foo');
    });

    it('calls the parse function with the model instance and the field value', async () => {
      await user.parseValues();
      expect(parseId, 'to have calls satisfying', () => {
        parseId(user, 1);
      });
    });

    it('parses all fields with a parse-value function', async () => {
      user.setValues({ id: 1, name: 'foo', confirmed: false });
      await user.parseValues();
      expect(parseId, 'to have calls satisfying', () => {
        parseId(user, 1);
      });
      expect(parseName, 'to have calls satisfying', () => {
        parseName(user, 'foo');
      });
    });

    it('resolves with the Model instance', async () => {
      await expect(user.parseValues(), 'to be fulfilled with', user);
    });

    describe('when passed a list of fields whose values to parse', () => {
      it('parses only those field values', async () => {
        await user.parseValues({ fields: ['id'] });
        expect(user, 'to satisfy', { id: 10, name: 'foo', confirmed: false });
        expect(parseName, 'was not called');
      });

      it('skips fields with no parse-value function configured', async () => {
        await user.parseValues({ fields: ['confirmed'] });
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
      Foo.fields = { id: { primary: true }, name: {} };
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

    it('allows overwriting the `require` option to `false`', () => {
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
          id: { primary: true },
          name: { unique: true },
          number: { unique: true }
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

  describe.only('Model.getGeneratedMethodName', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns an upper camel-cased method name', () => {
      const field = new Field(User, { name: 'firstName' });
      expect(User.getGeneratedMethodName(field), 'to be', 'FirstName');
    });

    it('handles underscores, hyphens and spaces in the field-name', () => {
      const field = new Field(User, { name: '__internal-group id' });
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
      const id = new Field(User, { name: 'id' });
      User.getGeneratedMethodQuery(id, 1);
      expect(User.query.setOption, 'to have calls satisfying', () =>
        User.query.setOption('where', { id: 1 })
      );
    });

    it('sets the `first` and `require` options for primary fields', () => {
      const id = new Field(User, { name: 'id', primary: true });
      User.getGeneratedMethodQuery(id, 1);
      expect(User.query.setOptions, 'to have calls satisfying', () =>
        User.query.setOptions({ first: true, require: true })
      );
    });

    it('sets the `first` and `require` options for unique fields', () => {
      const id = new Field(User, { name: 'id', unique: true });
      User.getGeneratedMethodQuery(id, 1);
      expect(User.query.setOptions, 'to have calls satisfying', () =>
        User.query.setOptions({ first: true, require: true })
      );
    });

    it('allows overwriting the `first` and `require` options', () => {
      const id = new Field(User, { name: 'id', primary: true });
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
      id = new Field(User, { name: 'id' });
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
        () => User.addField({ name: 'getValues' }),
        'to throw',
        new ModelError({
          Model: User,
          message: "field 'getValues' conflicts with User.prototype.getValues"
        })
      );
    });

    it('throws if the field-name is user-added Model.prototype property', () => {
      User = class extends Model {
        id() {}
      };
      expect(
        () => User.addField({ name: 'id' }),
        'to throw',
        new ModelError({
          Model: User,
          message: "field 'id' conflicts with User.prototype.id"
        })
      );
    });

    it('throws if the field-name is `$values`', () => {
      expect(
        () => User.addField({ name: '$values' }),
        'to throw',
        new ModelError({
          Model: User,
          message: "field '$values' conflicts with User.prototype.$values"
        })
      );
    });

    it('throws if the field-name is `$config`', () => {
      expect(
        () => User.addField({ name: '$config' }),
        'to throw',
        new ModelError({
          Model: User,
          message: "field '$config' conflicts with User.prototype.$config"
        })
      );
    });

    it("adds the field to the Model's field instances", () => {
      User.addField({ name: 'id' });
      expect(User.config.fields.instances, 'to equal', {
        id: new Field(User, { name: 'id' })
      });
    });

    it('supports an overriden Model.Field class', () => {
      User.Field = sinon.spy();
      User.addField({ name: 'id' });
      expect(
        User.Field,
        'to have calls satisfying',
        () => new User.Field(User, { name: 'id' })
      );
    });

    it("adds the field's to the Model's field-names", () => {
      User.addField({ name: 'id' });
      expect(User.config.fields.names, 'to equal', ['id']);
    });

    describe('if the field is has validation', () => {
      it("adds it to the Model's validated fields", () => {
        User.addField({ name: 'id', validate: 'integer' });
        expect(User.config.fields.validated, 'to equal', ['id']);
      });
    });

    describe('if the field has no validation', () => {
      it("does not add it to the Model's validated fields", () => {
        User.addField({ name: 'id' });
        expect(User.config.fields.validated, 'to be empty');
      });
    });

    describe('if the field is non-virtual', () => {
      it("adds it to the Model's field columns", () => {
        User.addField({ name: 'id', virtual: false, column: '_id' });
        expect(User.config.fields.columns, 'to equal', { id: '_id' });
      });
    });

    describe('if the field is virtual', () => {
      it("does not add it to the Model's field columns", () => {
        User.addField({ name: 'id', virtual: true, column: '_id' });
        expect(User.config.fields.columns, 'to be empty');
      });
    });

    describe('if the field is primary', () => {
      it("sets it as the Model's primary field", () => {
        User.addField({ name: 'id', primary: true });
        expect(User.config.fields.primary, 'to be', 'id');
      });
    });

    describe('if the field is non-primary', () => {
      it("does not set it as the Model's primary field", () => {
        User.addField({ name: 'id', primary: false });
        expect(User.config.fields.primary, 'to be undefined');
      });
    });

    describe('if the field is not updated', () => {
      it("adds it to the Model's not-updated fields", () => {
        User.addField({ name: 'id', updated: false });
        expect(User.config.fields.notUpdated, 'to equal', ['id']);
      });
    });

    describe('if the field is updated', () => {
      it("does not add it to the Model's not-updated fields", () => {
        User.addField({ name: 'id', updated: true });
        expect(User.config.fields.notUpdated, 'to be empty');
      });
    });

    describe('if the field is unique', () => {
      it("adds it to the Model's unique fields", () => {
        User.addField({ name: 'id', unique: true });
        expect(User.config.fields.unique, 'to equal', ['id']);
      });
    });

    describe('if the field is not unique', () => {
      it("does not add it to the Model's unique fields", () => {
        User.addField({ name: 'id', unique: false });
        expect(User.config.fields.unique, 'to be empty');
      });
    });

    describe('if the field has a default', () => {
      it("adds it to the Model's default fields", () => {
        User.addField({ name: 'id', default: 1 });
        expect(User.config.fields.defaulted, 'to equal', ['id']);
      });

      it('supports falsy defaults', () => {
        User.addField({ name: 'id', default: 0 });
        expect(User.config.fields.defaulted, 'to equal', ['id']);
      });
    });

    describe('if the field has no default', () => {
      it("does not add it to the Model's default fields", () => {
        User.addField({ name: 'id' });
        expect(User.config.fields.defaulted, 'to be empty');
      });
    });

    describe('if the field has a prepare-value function', () => {
      it('adds it to the fields with prepare-value functions', () => {
        User.addField({ name: 'id', prepareValue: () => {} });
        expect(User.config.fields.prepared, 'to equal', ['id']);
      });
    });

    describe('if the field has no prepare-value function', () => {
      it('does not add it to the fields with prepare-value functions', () => {
        User.addField({ name: 'id' });
        expect(User.config.fields.prepared, 'to be empty');
      });
    });

    describe('if the field has an parse-value function', () => {
      it('adds it to the fields with parse-value functions', () => {
        User.addField({ name: 'id', parseValue: () => {} });
        expect(User.config.fields.parsed, 'to equal', ['id']);
      });
    });

    describe('if the field has no parse-value function', () => {
      it('does not add it to the fields with parse-value functions', () => {
        User.addField({ name: 'id' });
        expect(User.config.fields.parsed, 'to be empty');
      });
    });

    describe('if the field enables generated methods', () => {
      it('adds generated methods to the Model', () => {
        User.addField({ name: 'id', methods: true });
        expect(User.fetchById, 'to be a function');
        expect(User.updateById, 'to be a function');
        expect(User.deleteById, 'to be a function');
      });
    });

    describe('if the field does not enable generated methods', () => {
      it('does not add generated methods to the Model', () => {
        User.addField({ name: 'id', methods: false });
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
      id = new Field(User, { name: 'id' });
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
    let idFieldConfig;
    let id;

    beforeEach(() => {
      idFieldConfig = { name: 'id' };
      User = class extends Model {};
      User.addField(idFieldConfig);
      id = User.fields.id;
    });

    it('throws if the field does not exist on the Model', () => {
      expect(
        () => User.removeField(new Field(User, { name: 'name' })),
        'to throw',
        new ModelError({ Model: User, message: "unkown field 'name'" })
      );
    });

    it('throws if a different field by the same name is passed', () => {
      expect(
        () => User.removeField(new Field(User, { name: 'id' })),
        'to throw',
        new ModelError({ Model: User, message: "unkown field 'id'" })
      );
    });

    it("removes the field from the Model's fields", () => {
      User.removeField(id);
      expect(User.config.fields.instances, 'to be empty');
    });

    it("removes the field from the Model's field-names", () => {
      User.removeField(id);
      expect(User.config.fields.names, 'to be empty');
    });

    describe('if the field has validation', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', validate: 'integer' };
      });

      it("removes it from the Model's validated fields", () => {
        User.removeField(id);
        expect(User.config.fields.validated, 'to be empty');
      });
    });

    describe('if the field is non-virtual', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', virtual: false, column: '_id' };
      });

      it("removes it from the Model's field columns", () => {
        User.removeField(id);
        expect(User.config.fields.columns, 'to be empty');
      });
    });

    describe('if the field is primary', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', primary: true };
      });

      it("unsets it as the Model's primary field", () => {
        User.removeField(id);
        expect(User.config.fields.primary, 'to be undefined');
      });
    });

    describe('if the field is not updated', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', updated: false };
      });

      it("removes it from the Model's not-updated fields", () => {
        User.removeField(id);
        expect(User.config.fields.notUpdated, 'to be empty');
      });
    });

    describe('if the field is unique', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', unique: true };
      });

      it("removes it from the Model's unique fields", () => {
        User.removeField(id);
        expect(User.config.fields.unique, 'to be empty');
      });
    });

    describe('if the field has a default', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', default: 1 };
      });

      it("removes it from the Model's default fields", () => {
        User.removeField(id);
        expect(User.config.fields.defaulted, 'to be empty');
      });

      it('supports falsy defaults', () => {
        User.addField({ name: 'name', default: '' });
        const name = User.fields.name;
        User.removeField(name);
        expect(User.config.fields.defaulted, 'to be empty');
      });
    });

    describe('if the field has a prepare-value function', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', prepareValue: () => {} };
      });

      it('removes it from the fields with prepare-value functions', () => {
        User.removeField(id);
        expect(User.config.fields.prepared, 'to be empty');
      });
    });

    describe('if the field has an parse-value function', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', parseValue: () => {} };
      });

      it('removes it from the fields with parse-value functions', () => {
        User.removeField(id);
        expect(User.config.fields.parsed, 'to be empty');
      });
    });

    describe('if the field enables generated methods', () => {
      beforeEach(() => {
        idFieldConfig = { name: 'id', methods: true };
      });

      it('removes generated methods from the Model', () => {
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

    it('returns an empty `schema` config', () => {
      expect(User.getDefaultConfig(), 'to satisfy', {
        schema: expect.it('to be undefined')
      });
    });

    it('returns an empty `table` config', () => {
      expect(User.getDefaultConfig(), 'to satisfy', {
        table: expect.it('to be undefined')
      });
    });

    it('returns an empty `fields` configs', () => {
      expect(User.getDefaultConfig(), 'to satisfy', {
        fields: {
          instances: {},
          columns: {},
          names: [],
          validated: [],
          primary: expect.it('to be undefined'),
          unique: [],
          notUpdated: [],
          defaulted: [],
          prepared: [],
          parsed: []
        }
      });
    });

    it('returns the `options` config with query defaults set', () => {
      expect(User.getDefaultConfig(), 'to satisfy', {
        options: {
          query: {
            default: { fields: [] },
            fetch: { from: User },
            debug: false
          }
        }
      });
    });
  });

  describe.only('Model.setupConfig', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it("sets the Model's default config", () => {
      User.setupConfig();
      expect(User.$config, 'to satisfy', User.getDefaultConfig());
    });

    describe('when a Model is subclassed', () => {
      let Student;

      beforeEach(() => {
        User.schema = 'users';
        User.table = 'user';
        User.fields = ['id'];
        User.options = { query: { where: { id: 1 } } };
        Student = class extends User {};
        Student.setupConfig();
      });

      it('inherits `schema`', () => {
        expect(Student.$config.schema, 'to be', 'users');
      });

      it('inherits `table`', () => {
        expect(Student.$config.table, 'to be', 'user');
      });

      it('inherits `fields`', () => {
        expect(Student.$config.fields.instances, 'to satisfy', {
          id: new Field(Student, { name: 'id' })
        });
      });

      it('inherits `options`', () => {
        expect(Student.$config.options, 'to satisfy', {
          query: {
            default: {
              fields: expect
                .it('to be', Student.$config.fields.names)
                .and('to equal', ['id'])
            },
            fetch: { from: Student },
            debug: false,
            where: { id: 1 }
          }
        });
      });

      it('allows appending options', () => {
        Student.options = { query: { where: { name: 'foo' } } };
        expect(Student.$config.options, 'to satisfy', {
          query: { where: { id: 1, name: 'foo' } }
        });
      });

      it('does not overwrite the `Model` config', () => {
        expect(Student.$config.Model, 'to be', Student);
      });

      it('leaves the parent config as is', () => {
        expect(User.$config, 'to satisfy', {
          Model: User,
          schema: 'users',
          table: 'user',
          fields: { instances: { id: new Field(User, { name: 'id' }) } },
          options: {
            query: {
              default: {
                fields: expect
                  .it('to be', User.$config.fields.names)
                  .and('to equal', ['id'])
              },
              fetch: { from: User },
              debug: false,
              where: { id: 1 }
            }
          }
        });
      });

      it(`does not overwrite the child's default options`, () => {
        User = class extends Model {};
        Student = class extends User {};
        User.getDefaultConfig = () => ({
          Model: User,
          fields: { instances: {} },
          options: { foo: 'user' }
        });
        Student.getDefaultConfig = () => ({
          Model: Student,
          fields: { instances: {} },
          options: { foo: 'student' }
        });
        User.setupConfig();
        Student.setupConfig();
        expect(User.$config.options, 'to equal', {
          foo: 'user'
        });
        expect(Student.$config.options, 'to equal', {
          foo: 'student'
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

  describe.only('Model.addOptions', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = ['id'];
    });

    it('allows adding `query` options', () => {
      User.addOptions({ query: { field: 'id' } });
      expect(User.config.options, 'to satisfy', {
        query: { field: 'id' }
      });
      User.addOptions({ query: { where: { id: 1 } } });
      expect(User.config.options, 'to satisfy', {
        query: { field: 'id', where: { id: 1 } }
      });
    });

    it('allows adding `plugins` options', () => {
      User.addOptions({ plugins: { toJSON: { exclude: ['id'] } } });
      expect(User.config.options, 'to satisfy', {
        plugins: { toJSON: { exclude: ['id'] } }
      });
    });

    it('merges options', () => {
      User.addOptions({ query: { where: { id: 1 } } });
      expect(User.config.options, 'to satisfy', {
        query: { where: { id: 1 } }
      });
      User.addOptions({ query: { where: { name: 'foo' } } });
      expect(User.config.options, 'to satisfy', {
        query: {
          where: { id: 1, name: 'foo' }
        }
      });
    });

    it('does not modify the object passed', () => {
      const options = { query: { where: { id: 1 } } };
      User.addOptions(options);
      expect(options, 'to equal', { query: { where: { id: 1 } } });
    });

    it('allows overwriting options', () => {
      User.addOptions({ query: { where: { id: 1 } } });
      expect(User.config.options, 'to satisfy', {
        query: { where: { id: 1 } }
      });
      User.addOptions({ query: { where: { id: [1] } } });
      expect(User.config.options, 'to satisfy', {
        query: { where: { id: [1] } }
      });
    });

    it('allows overwriting default options', () => {
      User.addOptions({ query: { from: 'foo', fields: ['foo'] } });
      expect(User.config.options, 'to satisfy', {
        query: { from: 'foo', fields: ['foo'] }
      });
    });
  });

  describe.only('Model.options', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it('returns options with query default options set', () => {
      expect(User.options, 'to equal', {
        query: { default: { fields: [] }, fetch: { from: User }, debug: false }
      });
    });

    it('allows setting and getting options', () => {
      User.options = { query: { field: 'id' } };
      expect(User.options, 'to satisfy', { query: { field: 'id' } });
    });
  });

  describe.only('Model.addFields', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    it("sets the Model's fields", () => {
      User.addFields({ id: {} });
      expect(User.config.fields.instances, 'to equal', {
        id: new Field(User, { name: 'id' })
      });
    });

    it('allows setting fields via an array', () => {
      User.addFields(['id']);
      expect(User.config.fields.instances, 'to equal', {
        id: new Field(User, { name: 'id' })
      });
    });

    it('allows setting fields via Field instances', () => {
      User.addFields({ id: new Field(User, { name: 'id' }) });
      expect(User.config.fields.instances, 'to equal', {
        id: new Field(User, { name: 'id' })
      });
    });

    it('overwrites the `name` property in a field config', () => {
      User.addFields({ id: { name: 'foo' } });
      expect(User.config.fields.instances, 'to equal', {
        id: new Field(User, { name: 'id' })
      });
    });

    it('allows adding fields', () => {
      User.addFields(['id']);
      expect(User.config.fields.instances, 'to satisfy', {
        id: new Field(User, { name: 'id' })
      });
      User.addFields(['name']);
      expect(User.config.fields.instances, 'to satisfy', {
        id: new Field(User, { name: 'id' }),
        name: new Field(User, { name: 'name' })
      });
    });

    it('allows replacing fields', () => {
      User.addFields({ id: { primary: true } });
      expect(User.config, 'to satisfy', {
        fields: {
          instances: { id: new Field(User, { name: 'id', primary: true }) },
          names: ['id'],
          primary: 'id'
        }
      });
      User.addFields({ id: {} });
      expect(User.config, 'to satisfy', {
        fields: {
          instances: { id: new Field(User, { name: 'id' }) },
          names: ['id'],
          primary: expect.it('to be undefined')
        }
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

    it('allows setting and getting fields', () => {
      User.fields = { id: {} };
      expect(User.fields, 'to equal', { id: new Field(User, { name: 'id' }) });
    });
  });

  describe.only('Model.columns', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
    });

    describe('if the Model has no fields configured', () => {
      it('returns an empty object', () => {
        expect(User.columns, 'to equal', {});
      });
    });

    describe('if the Model has fields configured', () => {
      it("returns the Model's field column mappings", () => {
        User.fields = { id: { column: '_id' }, name: { column: 'NAME' } };
        expect(User.columns, 'to exhaustively satisfy', {
          id: '_id',
          name: 'NAME'
        });
      });
    });
  });

  describe.only('Model.query', () => {
    let User;

    beforeEach(() => {
      User = class extends Model {};
      User.fields = ['id'];
      User.options = { query: { where: { id: 1 } } };
    });

    it('returns a Query instance', () => {
      expect(User.query, 'to be a', Query);
    });

    it('configures the Query instance with the model', () => {
      User.Query = sinon.stub().returns({
        setDefaultOptions() {},
        setMethodOptions() {},
        setOptions() {}
      });
      // eslint-disable-next-line no-unused-expressions
      User.query;
      expect(User.Query, 'to have calls satisfying', () => {
        // eslint-disable-next-line no-new
        new User.Query(expect.it('to be model class', User));
      });
    });

    it('sets default options on the Query instance', () => {
      expect(User.query.getOptions(), 'to satisfy', {
        debug: false,
        from: [User],
        fields: ['id']
      });
    });

    it('sets configured options on the Query instance', () => {
      expect(User.query.getOptions(), 'to satisfy', { where: [{ id: 1 }] });
    });

    it('allows overwriting default options', () => {
      User = class extends Model {};
      User.fields = ['id'];
      User.options = { query: { fields: ['name'] } };
      expect(User.query.getOptions(), 'to satisfy', { fields: ['name'] });
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
          required: true,
          primary: true,
          methods: true
        },
        name: {
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
