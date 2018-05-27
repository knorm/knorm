const uuid = require('uuid');
const Field = require('../lib/Field');
const Model = require('../lib/Model');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('./lib/unexpected-workaround'));

describe('Field', function() {
  describe('constructor', function() {
    it('throws an error if the field name is not provided', function() {
      expect(() => new Field(), 'to throw', new Error('Field requires a name'));
    });

    it('throws an error if the model is not provided', function() {
      expect(
        () => new Field({ name: 'foo' }),
        'to throw',
        new Error('Field `foo` requires a subclass of `Model`')
      );
    });

    it('throws an error if the field type is not provided', function() {
      class Foo extends Model {}
      expect(
        () =>
          new Field({
            name: 'bar',
            model: Foo
          }),
        'to throw',
        new Error('Field `Foo.bar` has no type configured')
      );
    });

    it('throws an error if the field type is not supported', function() {
      class Foo extends Model {}
      expect(
        () =>
          new Field({
            name: 'bar',
            model: Foo,
            type: 'bar'
          }),
        'to throw',
        new Error('Field `Foo.bar` has an invalid type `bar`')
      );
    });

    it("throws an error if 'validate' is provided and is not a function", function() {
      class Foo extends Model {}
      expect(
        () =>
          new Field({
            name: 'bar',
            model: Foo,
            type: 'string',
            validate: {
              oneOf: ['foo', 'bar']
            }
          }),
        'to throw',
        new Error('`validate` option for field `Foo.bar` should be a function')
      );
    });

    describe('with a column name configured', function() {
      it("sets the field's column name from configured value", function() {
        class Foo extends Model {}
        const field = new Field({
          name: 'bar',
          model: Foo,
          type: 'string',
          column: 'the column name'
        });
        expect(field.column, 'to be', 'the column name');
      });

      it('does not call getColumnName', function() {
        class Foo extends Model {}
        const spy = sinon.spy(Field.prototype, 'getColumnName');
        // eslint-disable-next-line no-unused-vars
        const field = new Field({
          name: 'bar',
          model: Foo,
          type: 'string',
          column: 'bar'
        });
        expect(spy, 'was not called');
        spy.restore();
      });
    });

    describe('without a column name configured', function() {
      it("calls getColumnName to set the field's column name", function() {
        class Foo extends Model {}
        const stub = sinon
          .stub(Field.prototype, 'getColumnName')
          .returns('the column name');
        const field = new Field({
          name: 'bar',
          model: Foo,
          type: 'string'
        });
        expect(stub, 'to have calls satisfying', () => {
          stub('bar');
        });
        expect(field.column, 'to be', 'the column name');
        stub.restore();
      });
    });

    describe('with `cast` options', function() {
      it('throws if `cast.forSave` is not a function', function() {
        class Foo extends Model {}
        expect(
          () =>
            new Field({
              name: 'bar',
              model: Foo,
              type: 'string',
              cast: {
                forSave: 'foo'
              }
            }),
          'to throw',
          new Error(
            '`cast.forSave` option for field `Foo.bar` should be a function'
          )
        );
      });

      it('throws if `cast.forFetch` is not a function', function() {
        class Foo extends Model {}
        expect(
          () =>
            new Field({
              name: 'bar',
              model: Foo,
              type: 'string',
              cast: {
                forFetch: 'foo'
              }
            }),
          'to throw',
          new Error(
            '`cast.forFetch` option for field `Foo.bar` should be a function'
          )
        );
      });
    });

    describe('for `json` and `jsonb` fields with a `schema` config', function() {
      class Foo extends Model {}

      describe('with a root-level schema', function() {
        it('throws the correct error if the schema config has no `type`', function() {
          expect(
            () =>
              new Field({
                name: 'json',
                model: Foo,
                type: 'json',
                schema: { required: true }
              }),
            'to throw',
            new Error('Field `Foo.json` has no type configured')
          );
        });

        it('throws the correct error if a schema config has an invalid `type`', function() {
          expect(
            () =>
              new Field({
                name: 'json',
                model: Foo,
                type: 'json',
                schema: { type: 'foo', required: true }
              }),
            'to throw',
            new Error('Field `Foo.json` has an invalid type `foo`')
          );
        });

        it("allows adding schema fields with the `schema: 'type'` shorthand", function() {
          expect(
            new Field({
              name: 'json',
              model: Foo,
              type: 'array',
              schema: 'string'
            }),
            'to satisfy',
            {
              validators: {
                schema: expect.it(
                  'to be field',
                  new Field({
                    name: 'json',
                    path: 'json',
                    model: Foo,
                    type: 'string'
                  })
                )
              }
            }
          );
        });
      });

      describe('with a schema with nested fields', function() {
        it('throws the correct error if a nested field has no `type`', function() {
          expect(
            () =>
              new Field({
                name: 'json',
                model: Foo,
                type: 'json',
                schema: { foo: { required: true } }
              }),
            'to throw',
            new Error('Field `Foo.json.foo` has no type configured')
          );
        });

        it('throws the correct error if a nested field has an invalid `type`', function() {
          expect(
            () =>
              new Field({
                name: 'json',
                model: Foo,
                type: 'json',
                schema: { foo: { type: 'foo', required: true } }
              }),
            'to throw',
            new Error('Field `Foo.json.foo` has an invalid type `foo`')
          );
        });

        it("allows adding schema fields with the `schema: 'type'` shorthand", function() {
          expect(
            new Field({
              name: 'json',
              model: Foo,
              type: 'json',
              schema: { foo: 'string' }
            }),
            'to satisfy',
            {
              validators: {
                schema: {
                  foo: expect.it(
                    'to be field',
                    new Field({
                      name: 'foo',
                      path: 'json.foo',
                      model: Foo,
                      type: 'string'
                    })
                  )
                }
              }
            }
          );
        });
      });
    });
  });

  describe('Field.prototype.getColumnName', function() {
    it('returns the field name passed as is', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'firstName',
        model: Foo,
        type: 'string'
      });
      expect(field.getColumnName('firstName'), 'to be', 'firstName');
    });
  });

  describe('Field.prototype.throwValidationError', function() {
    it('throws a `ValidationError`', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'firstName',
        model: Foo,
        type: 'string'
      });
      expect(() => field.throwValidationError(), 'to throw', {
        name: 'ValidationError'
      });
    });

    it('throws a validation error from `Field.ValidationError`', function() {
      // allows configuring the ValidationError class entirely
      class CustomValidationError {}
      const ValidationError = Field.ValidationError;
      Field.ValidationError = CustomValidationError;
      class Foo extends Model {}
      const field = new Field({
        name: 'firstName',
        model: Foo,
        type: 'string'
      });
      expect(
        () => field.throwValidationError(),
        'to throw',
        new CustomValidationError()
      );
      Field.ValidationError = ValidationError;
    });
  });

  describe('Field.prototype.cast', function() {
    class User extends Model {}

    describe('with no cast functions defined', function() {
      it('returns undefined', function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string'
        });
        expect(
          field.cast('bar value', 'a model instance', { forSave: true }),
          'to be undefined'
        );
      });
    });

    describe('with a `forSave` cast function', function() {
      it('calls the function with the value if the `forSave` option is enabled', function() {
        const forSave = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: {
            forSave
          }
        });
        field.cast('bar value', 'a model instance', { forSave: true });
        expect(forSave, 'was called with', 'bar value');
      });

      it('calls the function with `this` set to the passed model instance', function() {
        const forSave = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: {
            forSave
          }
        });
        field.cast('bar value', 'a model instance', { forSave: true });
        expect(forSave, 'was called on', 'a model instance');
      });
    });

    describe('with a `forFetch` cast function', function() {
      it('calls the function with the value if the `forFetch` option is enabled', function() {
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: {
            forFetch
          }
        });
        field.cast('bar value', 'a model instance', { forFetch: true });
        expect(forFetch, 'was called with', 'bar value');
      });

      it('calls the function with `this` set to the passed model instance', function() {
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: {
            forFetch
          }
        });
        field.cast('bar value', 'a model instance', { forFetch: true });
        expect(forFetch, 'was called on', 'a model instance');
      });
    });

    describe('with both `forFetch` and `forSave` cast functions', function() {
      it('calls only the `forFetch` cast function if the `forFetch` option is enabled', function() {
        const forSave = sinon.spy();
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: {
            forSave,
            forFetch
          }
        });
        field.cast('bar value', 'a model instance', { forFetch: true });
        expect(forFetch, 'was called');
        expect(forSave, 'was not called');
      });

      it('calls only the `forSave` cast function if the `forSave` option is enabled', function() {
        const forSave = sinon.spy();
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: {
            forSave,
            forFetch
          }
        });
        field.cast('bar value', 'a model instance', { forSave: true });
        expect(forSave, 'was called');
        expect(forFetch, 'was not called');
      });
    });
  });

  describe('Field.prototype.hasDefault', function() {
    class User extends Model {}

    it('returns false if the field was not configured with a default value', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: 'string'
      });
      expect(field.hasDefault(), 'to be false');
    });

    it('returns true if the field was configured with a default value', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: 'string',
        default: 'foo'
      });
      expect(field.hasDefault(), 'to be true');
    });

    it('returns true if the field was configured with a default value as a function', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: 'string',
        default: () => {}
      });
      expect(field.hasDefault(), 'to be true');
    });

    it("returns true if the field was configured with the default value as 'false'", function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: 'string',
        default: false
      });
      expect(field.hasDefault(), 'to be true');
    });

    it("returns true if the field was configured with the default value as 'null'", function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: 'string',
        default: null
      });
      expect(field.hasDefault(), 'to be true');
    });
  });

  describe('Field.prototype.getDefault', function() {
    class User extends Model {}

    it('returns the default value configured', function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: 'string',
        default: 'foo'
      });
      expect(field.getDefault(), 'to be', 'foo');
    });

    describe('when the default value is a function', function() {
      it('returns the return value of the function', function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          default: () => 'bar'
        });
        expect(field.getDefault(), 'to be', 'bar');
      });

      it("calls the function with 'this' set to the instance passed", function() {
        const stub = sinon.stub().returns('bar');
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          default: stub
        });
        field.getDefault('a model instance');
        expect(stub, 'was called once').and(
          'was called on',
          'a model instance'
        );
      });
    });
  });

  describe('Field.prototype.validate', function() {
    class User extends Model {}

    it('returns a Promise', async function() {
      const field = new Field({
        name: 'firstName',
        model: User,
        type: 'string'
      });
      await expect(field.validate(), 'to be fulfilled');
    });

    describe('required', function() {
      it('rejects with a RequiredError if no value is passed', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          required: true
        });
        await expect(field.validate(), 'to be rejected with', {
          name: 'ValidationError',
          type: 'RequiredError'
        });
      });

      it("rejects if the value is 'undefined'", async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          required: true
        });
        await expect(field.validate(undefined), 'to be rejected with', {
          name: 'ValidationError',
          type: 'RequiredError'
        });
      });

      it("rejects if the value is 'null'", async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          required: true
        });
        await expect(field.validate(null), 'to be rejected with', {
          name: 'ValidationError',
          type: 'RequiredError'
        });
      });

      it('resolves if the value is set', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          required: true
        });
        await expect(field.validate('foo'), 'to be fulfilled');
      });
    });

    describe('type', function() {
      it('rejects with a TypeError if an invalid value is set', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'text'
        });
        await expect(field.validate({}), 'to be rejected with', {
          name: 'ValidationError',
          type: 'TypeError'
        });
      });

      it('does not type-validate if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'text'
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not type-validate if the value is null', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'text'
        });
        await expect(field.validate(null), 'to be fulfilled');
      });

      describe('resolves for valid types', function() {
        it("any value type against the 'any' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'any'
          });
          await expect(field.validate('foo'), 'to be fulfilled');
          await expect(field.validate(1), 'to be fulfilled');
          await expect(field.validate(true), 'to be fulfilled');
          await expect(field.validate(0.1), 'to be fulfilled');
          await expect(field.validate(new Date()), 'to be fulfilled');
        });

        it("integers against the 'number' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'number'
          });
          await expect(field.validate(1), 'to be fulfilled');
        });

        it("decimals against the 'number' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'number'
          });
          await expect(field.validate(1.2), 'to be fulfilled');
        });

        it("strings against the 'string' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'string'
          });
          await expect(field.validate('foo'), 'to be fulfilled');
        });

        it("strings against the 'text' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'text'
          });
          await expect(field.validate('foo'), 'to be fulfilled');
        });

        it("integers against the 'integer' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'integer'
          });
          await expect(field.validate(1), 'to be fulfilled');
        });

        it("dates against the 'dateTime' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'dateTime'
          });
          await expect(field.validate(new Date()), 'to be fulfilled');
        });

        it("dates against the 'date' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'date'
          });
          await expect(field.validate(new Date()), 'to be fulfilled');
        });

        it("true against the 'boolean' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'boolean'
          });
          await expect(field.validate(true), 'to be fulfilled');
        });

        it("false against the 'boolean' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'boolean'
          });
          await expect(field.validate(false), 'to be fulfilled');
        });

        it("uuid.v4 against the 'uuid' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'uuid'
          });
          await expect(field.validate(uuid.v4()), 'to be fulfilled');
        });

        it("uuid.v1 against the 'uuid' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'uuid'
          });
          await expect(field.validate(uuid.v1()), 'to be fulfilled');
        });

        it("uuid.v4 against the 'uuid4' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'uuid4'
          });
          await expect(field.validate(uuid.v4()), 'to be fulfilled');
        });

        it("floating point values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'decimal'
          });
          await expect(field.validate(10.56), 'to be fulfilled');
        });

        it("floating point values without whole numbers against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'decimal'
          });
          await expect(field.validate(0.5600976), 'to be fulfilled');
        });

        it("integer values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'decimal'
          });
          await expect(field.validate(30), 'to be fulfilled');
        });

        it("zero against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'decimal'
          });
          await expect(field.validate(0), 'to be fulfilled');
        });

        it("string floating point values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'decimal'
          });
          await expect(field.validate('10.00'), 'to be fulfilled');
        });

        it("positive string floating point values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'decimal'
          });
          await expect(field.validate('+10.00345'), 'to be fulfilled');
        });

        it("negative floating point values against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'decimal'
          });
          await expect(field.validate(-9923410.03), 'to be fulfilled');
        });

        it("buffer values against the 'binary' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'binary'
          });
          await expect(field.validate(Buffer.from('')), 'to be fulfilled');
        });

        it("email values against the 'email' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'email'
          });
          await expect(field.validate('foo@bar.com'), 'to be fulfilled');
        });
      });

      describe('rejects for invalid types', function() {
        it("true against the 'number' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'number'
          });
          await expect(field.validate(true), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for fractions against the 'integer' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'integer'
          });
          await expect(field.validate(1.5), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for string numbers against the 'integer' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'integer'
          });
          await expect(field.validate('1'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for date strings against the 'dateTime' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'dateTime'
          });
          const dateString = new Date().toString();
          await expect(field.validate(dateString), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for date strings against the 'date' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'date'
          });
          const dateString = new Date().toString();
          await expect(field.validate(dateString), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for truthy values against the 'boolean' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'boolean'
          });
          await expect(field.validate(1), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("for falsy values against the 'boolean' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'boolean'
          });
          await expect(field.validate(0), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("invalid uuid's against the 'uuid' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'uuid'
          });
          await expect(
            field.validate('not-valid-uuid'),
            'to be rejected with',
            { name: 'ValidationError', type: 'TypeError' }
          );
        });

        it("uuid.v1 against the 'uuid4' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'uuid4'
          });
          const uuidV1 = uuid.v1();
          await expect(field.validate(uuidV1), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("strings against the 'decimal' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'decimal'
          });
          await expect(field.validate('foo'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("string values against the 'binary' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'binary'
          });
          await expect(field.validate('bar'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("object values against the 'binary' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'binary'
          });
          await expect(field.validate({}), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("invalid email values against the 'email' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'email'
          });
          await expect(field.validate('foo@bar'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it("integer values against the 'email' type", async function() {
          const field = new Field({
            name: 'firstName',
            model: User,
            type: 'email'
          });
          await expect(field.validate(1), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });
      });
    });

    describe('minLength', function() {
      it('rejects with a `MinLengthError` if the value is shorter than the minLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          minLength: 6
        });
        await expect(field.validate('a'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'MinLengthError'
        });
      });

      it('does not reject an if the value is the same lenth as the minLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          minLength: 6
        });
        await expect(field.validate('123456'), 'to be fulfilled');
      });

      it('does not reject an if the value is longer than the minLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          minLength: 6
        });
        await expect(field.validate('1234567'), 'to be fulfilled');
      });

      it('does not reject if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          minLength: 6
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          minLength: 6
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('maxLength', function() {
      it('rejects with a `MaxLengthError` if the value is longer than the maxLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          maxLength: 6
        });
        await expect(field.validate('1234567'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'MaxLengthError'
        });
      });

      it('allows a `minLength` of zero', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          maxLength: 0
        });
        await expect(field.validate('1'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'MaxLengthError'
        });
        await expect(field.validate(''), 'to be fulfilled');
      });

      it('does not reject an if the value is the same lenth as the maxLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          maxLength: 6
        });
        await expect(field.validate('123456'), 'to be fulfilled');
      });

      it('does not reject an if the value is shorter than the maxLength', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          maxLength: 6
        });
        await expect(field.validate('12345'), 'to be fulfilled');
      });

      it('does not reject if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          maxLength: 6
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          maxLength: 6
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('oneOf', function() {
      it('rejects with a OneOfError if the value is not included in oneOf', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          oneOf: [1, 2]
        });
        await expect(field.validate(3), 'to be rejected with', {
          name: 'ValidationError',
          type: 'OneOfError'
        });
      });

      it('does not reject if the value is included in oneOf', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          oneOf: [1, 2]
        });
        await expect(field.validate(1), 'to be fulfilled');
      });

      it('checks against the casing of strings', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          oneOf: ['READ', 'UNREAD']
        });
        await expect(field.validate('read'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'OneOfError'
        });
      });

      it('does not reject if the value is `undefined`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          oneOf: [1, 2]
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          oneOf: [1, 2]
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('equals', function() {
      it('rejects with an `EqualsError` if the value does not equal the expected value', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          equals: 1
        });
        await expect(field.validate(3), 'to be rejected with', {
          name: 'ValidationError',
          type: 'EqualsError'
        });
      });

      it('allows `equals` with a value of zero', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          equals: 0
        });
        await expect(field.validate(1), 'to be rejected with', {
          name: 'ValidationError',
          type: 'EqualsError'
        });
        await expect(field.validate(0), 'to be fulfilled');
      });

      it('does not reject if the value equals the expected value', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          equals: 1
        });
        await expect(field.validate(1), 'to be fulfilled');
      });

      it('checks against the casing of strings', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          equals: 'READ'
        });
        await expect(field.validate('read'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'EqualsError'
        });
      });

      it('does not reject if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          equals: 1
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          equals: 1
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('regex', function() {
      it('rejects with an RegexError if the value does not match the regex', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          regex: /[0-2]/
        });
        await expect(field.validate(3), 'to be rejected with', {
          name: 'ValidationError',
          type: 'RegexError'
        });
      });

      it('does not reject if the value matches the regex', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          regex: /hello/
        });
        await expect(field.validate('hello world'), 'to be fulfilled');
      });

      it('does not reject if the value is undefined', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          equals: 1
        });
        await expect(field.validate(undefined), 'to be fulfilled');
      });

      it('does not reject if the passed value is `null`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'integer',
          equals: 1
        });
        await expect(field.validate(null), 'to be fulfilled');
      });
    });

    describe('with a custom validator', function() {
      it('calls the validator with the passed value', async function() {
        const validate = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          validate
        });
        await field.validate('bar value');
        await expect(validate, 'to have calls satisfying', () => {
          validate('bar value');
        });
      });

      it("calls the validator with 'this' set to the passed model instance", async function() {
        const validate = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          validate
        });
        await field.validate('bar value', 'a model instance');
        await expect(validate, 'was called once').and(
          'was called on',
          'a model instance'
        );
      });

      it('does not call the validator if the value is `undefined`', async function() {
        const validate = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          validate
        });
        await field.validate();
        await expect(validate, 'was not called');
      });

      it('calls the validator if the passed value is `null`', async function() {
        const validate = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          validate
        });
        await field.validate(null);
        await expect(validate, 'was called once');
      });

      it('rejects with the error thrown from the validator', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          validate() {
            throw new Error('custom error');
          }
        });
        await expect(
          field.validate('bar value'),
          'to be rejected with',
          new Error('custom error')
        );
      });

      it('rejects with the rejection reason returned from the validator', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          validate() {
            return Promise.reject(new Error('rejection reason'));
          }
        });
        await expect(
          field.validate('bar value'),
          'to be rejected with',
          new Error('rejection reason')
        );
      });

      it('rejects with a ValidatorError if the validator returns `false`', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          validate() {
            return false;
          }
        });
        await expect(field.validate('bar value'), 'to be rejected with', {
          name: 'ValidationError',
          type: 'ValidatorError'
        });
      });

      it('does not reject if the validator returns nothing', async function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          validate() {}
        });
        await expect(field.validate(), 'to be fulfilled');
      });

      describe('when the validator returns an object', function() {
        describe('with valid validators', function() {
          it('runs the new validators', async function() {
            const field = new Field({
              name: 'firstName',
              model: User,
              type: 'string',
              validate() {
                return {
                  maxLength: 2
                };
              }
            });
            await expect(field.validate('bar value'), 'to be rejected with', {
              name: 'ValidationError',
              type: 'MaxLengthError'
            });
          });
        });

        describe('with a `validate` function', function() {
          it('runs the new custom validator', async function() {
            const secondValidateSpy = sinon.spy();
            const field = new Field({
              name: 'firstName',
              model: User,
              type: 'string',
              validate() {
                return {
                  validate: secondValidateSpy
                };
              }
            });
            await field.validate('bar value');
            expect(secondValidateSpy, 'to have calls satisfying', () => {
              secondValidateSpy('bar value');
            });
          });

          it('runs the new validator with `this` set to the passed model instance', async function() {
            const secondValidateSpy = sinon.spy();
            const field = new Field({
              name: 'firstName',
              model: User,
              type: 'string',
              validate() {
                return {
                  validate: secondValidateSpy
                };
              }
            });
            await field.validate('bar value', 'a model instance');
            await expect(secondValidateSpy, 'was called once').and(
              'was called on',
              'a model instance'
            );
          });

          it('runs the new validator asynchronously', async function() {
            let called;
            const field = new Field({
              name: 'firstName',
              model: User,
              type: 'string',
              validate() {
                return {
                  validate() {
                    return Promise.resolve().then(() => {
                      called = true;
                    });
                  }
                };
              }
            });
            await field.validate('bar value');
            expect(called, 'to be true');
          });
        });

        describe('with no validators', function() {
          it('does nothing', async function() {
            const field = new Field({
              name: 'firstName',
              model: User,
              type: 'string',
              validate() {
                return new Date();
              }
            });
            await expect(field.validate(), 'to be fulfilled');
          });
        });
      });
    });

    describe('for `json` and `jsonb` fields', function() {
      describe('without a `schema` configured', function() {
        let json;
        let jsonb;

        before(function() {
          json = new Field({
            name: 'json',
            model: User,
            type: 'json'
          });

          jsonb = new Field({
            name: 'jsonb',
            model: User,
            type: 'jsonb'
          });
        });

        it('fulfils if the value is `undefined`', async function() {
          await expect(json.validate(undefined), 'to be fulfilled');
        });

        it('fulfils if the value is `null`', async function() {
          await expect(jsonb.validate(null), 'to be fulfilled');
        });

        it('fulfils for arrays', async function() {
          await expect(json.validate([1, 2, 3]), 'to be fulfilled');
        });

        it('fulfils for objects', async function() {
          await expect(jsonb.validate({ a: 'b' }), 'to be fulfilled');
        });

        it('fulfils for integers', async function() {
          await expect(json.validate(1), 'to be fulfilled');
        });

        it('fulfils for boolean valuess', async function() {
          await expect(jsonb.validate(true), 'to be fulfilled');
        });

        it('fulfils for valid json strings', async function() {
          await expect(json.validate('[{ "foo": "foo" }]'), 'to be fulfilled');
        });

        it('fulfils for invalid json strings', async function() {
          // i.e it doesn't validate the json string
          await expect(jsonb.validate('{not: "valid"}'), 'to be fulfilled');
        });
      });

      describe('when passed a string value', function() {
        let field;

        before(function() {
          field = new Field({
            name: 'json',
            model: User,
            type: 'json',
            schema: { foo: { type: 'string' } }
          });
        });

        it('JSON.parses the value and runs validators on the parsed value', async function() {
          await expect(field.validate('{"foo":1}'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
          await expect(field.validate('{"foo":"1"}'), 'to be fulfilled');
        });

        it('converts JSON.parse errors to `type` errors', async function() {
          await expect(field.validate('{foo:"foo"}'), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
          await expect(field.validate('{"foo":"foo"}'), 'to be fulfilled');
        });

        describe('with a root-level `string` schema', function() {
          it('does not JSON.parse the value', async function() {
            const field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: 'string'
            });
            await expect(field.validate('foo'), 'to be fulfilled');
          });
        });
      });

      describe('with a root-level `schema` object', function() {
        let field;

        before(function() {
          field = new Field({
            name: 'json',
            model: User,
            type: 'json',
            schema: { type: 'string', required: true }
          });
        });

        it('fulfils for valid values', async function() {
          await expect(field.validate('foo'), 'to be fulfilled');
        });

        it('rejects for invalid values', async function() {
          await expect(field.validate(1), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it('rejects if passed an array value', async function() {
          await expect(field.validate(['bar']), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it('rejects if passed an object value', async function() {
          await expect(field.validate({ foo: 'bar' }), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        describe('with `required` set to true', function() {
          it('rejects if the value is `undefined`', async function() {
            await expect(field.validate(undefined), 'to be rejected with', {
              name: 'ValidationError',
              type: 'RequiredError'
            });
          });

          it('rejects if the value is `null`', async function() {
            await expect(field.validate(null), 'to be rejected with', {
              name: 'ValidationError',
              type: 'RequiredError'
            });
          });
        });

        describe('with a custom `validate` function', () => {
          let field;
          let validate;

          before(function() {
            validate = sinon.spy();
            field = new Field({
              name: 'firstName',
              model: User,
              type: 'json',
              schema: { type: 'string', validate }
            });
          });

          beforeEach(function() {
            validate.resetHistory();
          });

          it('calls the validator with the passed value', async function() {
            await field.validate('foo');
            await expect(validate, 'to have calls satisfying', () => {
              validate('foo');
            });
          });

          it("calls the validator with 'this' set to the passed model instance", async function() {
            await field.validate('foo', 'a model instance');
            await expect(validate, 'was called once').and(
              'was called on',
              'a model instance'
            );
          });
        });

        describe('with a root-level `array` field with an item `schema`', function() {
          let field;

          before(function() {
            field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: {
                type: 'array',
                maxLength: 2,
                schema: { type: 'string', required: true }
              }
            });
          });

          it('rejects if passed a non-array value', async function() {
            await expect(field.validate('bar'), 'to be rejected with', {
              name: 'ValidationError',
              type: 'TypeError'
            });
          });

          it('rejects if the value fails the `length` validators', async function() {
            await expect(
              field.validate(['foo', 'bar', 'quux']),
              'to be rejected with',
              { name: 'ValidationError', type: 'MaxLengthError' }
            );
          });

          it('fulfils if every item in the value passes validation', async function() {
            await expect(field.validate(['foo', 'bar']), 'to be fulfilled');
          });

          it('rejects if one item in the value fails validation', async function() {
            await expect(field.validate(['foo', 1]), 'to be rejected with', {
              name: 'ValidationError',
              type: 'TypeError'
            });
          });

          describe('with the item schema `required`', function() {
            it('rejects if an array value is `undefined`', async function() {
              await expect(field.validate([undefined]), 'to be rejected with', {
                name: 'ValidationError',
                type: 'RequiredError'
              });
            });

            it('rejects if an array value is `null`', async function() {
              await expect(field.validate([null]), 'to be rejected with', {
                name: 'ValidationError',
                type: 'RequiredError'
              });
            });

            it('rejects if the array is empty', async function() {
              await expect(field.validate([]), 'to be rejected with', {
                name: 'ValidationError',
                type: 'RequiredError'
              });
            });
          });
        });

        describe('with a root-level `array` field with no item `schema`', function() {
          let field;

          before(function() {
            field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: { type: 'array', minLength: 2 }
            });
          });

          it('rejects if passed a non-array value', async function() {
            await expect(field.validate('bar'), 'to be rejected with', {
              name: 'ValidationError',
              type: 'TypeError'
            });
          });

          it('rejects if the value fails the `length` validators', async function() {
            await expect(field.validate(['foo']), 'to be rejected with', {
              name: 'ValidationError',
              type: 'MinLengthError'
            });
          });

          it('fulfils for any array values', async function() {
            await expect(field.validate([{}, {}, {}]), 'to be fulfilled');
            await expect(field.validate(['foo', 1, false]), 'to be fulfilled');
          });
        });

        describe('with a root-level `array` field with a nested `schema`', function() {
          let field;

          before(function() {
            field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: {
                type: 'array',
                schema: {
                  type: 'object',
                  schema: { foo: { type: 'string' } }
                }
              }
            });
          });

          it('fulfils if the nested object value is `undefined`', async function() {
            await expect(
              field.validate([{ foo: undefined }]),
              'to be fulfilled'
            );
          });

          it('fulfils if the value is `null`', async function() {
            await expect(field.validate([{ foo: null }]), 'to be fulfilled');
          });

          it('fulfils if every item in the value passes validation', async function() {
            await expect(
              field.validate([{ foo: 'foo' }, { foo: 'bar' }]),
              'to be fulfilled'
            );
          });

          it('ignores nested keys that are not defined in the schema', async function() {
            await expect(
              field.validate([{ foo: 'foo', bar: 1 }]),
              'to be fulfilled'
            );
          });

          it('rejects if one object in the array fails validation', async function() {
            await expect(
              field.validate([{ foo: 'foo' }, { foo: 1 }]),
              'to be rejected with',
              { name: 'ValidationError', type: 'TypeError' }
            );
          });
        });

        describe('with a root-level `object` field with a nested `schema`', function() {
          let field;

          before(function() {
            field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: {
                type: 'object',
                schema: {
                  type: 'object',
                  schema: { foo: { type: 'string' } }
                }
              }
            });
          });

          it('fulfils if the value is `undefined`', async function() {
            await expect(field.validate(undefined), 'to be fulfilled');
          });

          it('fulfils if the value is `null`', async function() {
            await expect(field.validate(null), 'to be fulfilled');
          });

          it('rejects if the value is a number', async function() {
            await expect(field.validate(1), 'to be rejected with', {
              name: 'ValidationError',
              type: 'TypeError'
            });
          });

          it('rejects if the value is a boolean', async function() {
            await expect(field.validate(false), 'to be rejected with', {
              name: 'ValidationError',
              type: 'TypeError'
            });
          });

          it('ignores nested keys that are not defined in the schema', async function() {
            await expect(
              field.validate({ foo: 'foo', bar: 1 }),
              'to be fulfilled'
            );
          });

          it('rejects if the key value fails validation', async function() {
            await expect(field.validate({ foo: 1 }), 'to be rejected with', {
              name: 'ValidationError',
              type: 'TypeError'
            });
          });

          describe('without a `required` option', function() {
            it('fulfils if the nested key value is `undefined`', async function() {
              await expect(
                field.validate({ foo: undefined }),
                'to be fulfilled'
              );
            });

            it('fulfils if the nested key value is `null`', async function() {
              await expect(field.validate({ foo: null }), 'to be fulfilled');
            });
          });
        });

        describe('with a root-level `object` field  with no nested `schema`', function() {
          let field;

          before(function() {
            field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: {
                type: 'object'
              }
            });
          });

          it('rejects if passed a non-object value', async function() {
            await expect(field.validate('bar'), 'to be rejected with', {
              name: 'ValidationError',
              type: 'TypeError'
            });
          });

          it('fulfils if passed an array value', async function() {
            await expect(field.validate(['foo', 'bar']), 'to be fulfilled');
          });

          it('fulfils if passed an object value', async function() {
            await expect(field.validate({}), 'to be fulfilled');
          });

          it('fulfils if the value is `undefined`', async function() {
            await expect(field.validate(undefined), 'to be fulfilled');
          });

          it('fulfils if the value is `null`', async function() {
            await expect(field.validate(null), 'to be fulfilled');
          });
        });
      });

      describe('with a `schema` object with nested fields', function() {
        let field;

        before(function() {
          field = new Field({
            name: 'json',
            model: User,
            type: 'json',
            schema: { foo: { type: 'string', required: true } }
          });
        });

        it('rejects if passed an array value', async function() {
          // Missing required value for field `User.json.foo`
          await expect(
            field.validate([{ foo: 'bar' }]),
            'to be rejected with',
            { name: 'ValidationError', type: 'RequiredError' }
          );
        });

        it('rejects for invalid object values', async function() {
          await expect(field.validate({ foo: 1 }), 'to be rejected with', {
            name: 'ValidationError',
            type: 'TypeError'
          });
        });

        it('fulfils for valid object values', async function() {
          await expect(field.validate({ foo: 'bar' }), 'to be fulfilled');
        });

        it('ignores object keys that are not specified in the schema', async function() {
          await expect(
            field.validate({ foo: 'foo', bar: [] }),
            'to be fulfilled'
          );
        });

        it('fulfils if the value is `undefined`', async function() {
          await expect(field.validate(undefined), 'to be fulfilled');
        });

        it('fulfils if the value is `null`', async function() {
          await expect(field.validate(null), 'to be fulfilled');
        });

        describe('with a custom `validate` function', () => {
          let field;
          let validate;

          before(function() {
            validate = sinon.spy();
            field = new Field({
              name: 'firstName',
              model: User,
              type: 'json',
              schema: { foo: { type: 'string', validate } }
            });
          });

          beforeEach(function() {
            validate.resetHistory();
          });

          it('calls the validator with the passed value', async function() {
            await field.validate({ foo: 'bar' });
            await expect(validate, 'to have calls satisfying', () => {
              validate('bar');
            });
          });

          it("calls the validator with 'this' set to the passed model instance", async function() {
            await field.validate({ foo: 'bar' }, 'a model instance');
            await expect(validate, 'was called once').and(
              'was called on',
              'a model instance'
            );
          });
        });

        describe('with a nested `array` field with an item `schema`', function() {
          let field;

          before(function() {
            field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: {
                foo: {
                  type: 'array',
                  maxLength: 2,
                  schema: { type: 'string', required: true }
                }
              }
            });
          });

          it('rejects if passed a non-array value', async function() {
            await expect(
              field.validate({ foo: 'bar' }),
              'to be rejected with',
              { name: 'ValidationError', type: 'TypeError' }
            );
          });

          it('rejects if the value fails the `length` validators', async function() {
            await expect(
              field.validate({ foo: ['foo', 'bar', 'quux'] }),
              'to be rejected with',
              { name: 'ValidationError', type: 'MaxLengthError' }
            );
          });

          it('fulfils if the value is `undefined`', async function() {
            await expect(field.validate(undefined), 'to be fulfilled');
          });

          it('fulfils if the value is `null`', async function() {
            await expect(field.validate(null), 'to be fulfilled');
          });

          it('fulfils if every item in the value passes validation', async function() {
            await expect(
              field.validate({ foo: ['foo', 'bar'] }),
              'to be fulfilled'
            );
          });

          it('ignores keys in the array items that are not specified in the schema', async function() {
            await expect(
              field.validate({ foo: ['foo'], bar: [] }),
              'to be fulfilled'
            );
          });

          it('rejects if one item in the value fails validation', async function() {
            await expect(
              field.validate({ foo: ['foo', 1] }),
              'to be rejected with',
              { name: 'ValidationError', type: 'TypeError' }
            );
          });
        });

        describe('with a nested `array` field with no item `schema`', function() {
          let field;

          before(function() {
            field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: { foo: { type: 'array', minLength: 2 } }
            });
          });

          it('rejects if passed a non-array value', async function() {
            await expect(
              field.validate({ foo: 'bar' }),
              'to be rejected with',
              { name: 'ValidationError', type: 'TypeError' }
            );
          });

          it('rejects if the value fails the `length` validators', async function() {
            await expect(
              field.validate({ foo: ['foo'] }),
              'to be rejected with',
              { name: 'ValidationError', type: 'MinLengthError' }
            );
          });

          it('fulfils for any array values', async function() {
            await expect(
              field.validate({ foo: ['foo', 1, false, {}] }),
              'to be fulfilled'
            );
          });
        });

        describe('with a nested `object` field', function() {
          let field;

          before(function() {
            field = new Field({
              name: 'json',
              model: User,
              type: 'json',
              schema: {
                foo: {
                  type: 'object',
                  schema: { bar: { type: 'integer', required: true } }
                }
              }
            });
          });

          it('rejects if passed a nested array value', async function() {
            await expect(
              field.validate({ foo: { bar: [1] } }),
              'to be rejected with',
              { name: 'ValidationError', type: 'TypeError' }
            );
          });

          it('rejects for invalid nested object values', async function() {
            await expect(
              field.validate({ foo: { bar: 'bar' } }),
              'to be rejected with',
              { name: 'ValidationError', type: 'TypeError' }
            );
          });

          it('fulfils for valid nested object values', async function() {
            await expect(
              field.validate({ foo: { bar: 1 } }),
              'to be fulfilled'
            );
          });

          it('ignores object keys that are not specified in the nested schema', async function() {
            await expect(
              field.validate({ foo: { bar: 1, quux: 'quux' } }),
              'to be fulfilled'
            );
          });

          describe('with the nested schema `required`', function() {
            it('rejects if the value is `undefined` and the schema specifies `required`', async function() {
              await expect(
                field.validate({ foo: { bar: undefined } }),
                'to be rejected with',
                { name: 'ValidationError', type: 'RequiredError' }
              );
            });

            it('rejects if the value is `null`', async function() {
              await expect(
                field.validate({ foo: { bar: null } }),
                'to be rejected with',
                { name: 'ValidationError', type: 'RequiredError' }
              );
            });
          });
        });
      });
    });
  });
});
