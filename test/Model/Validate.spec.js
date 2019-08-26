const uuid1 = require('uuid/v1');
const uuid3 = require('uuid/v3');
const uuid4 = require('uuid/v4');
const uuid5 = require('uuid/v5');
const Knorm = require('../../lib/Knorm');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));

describe.only('Validate', () => {
  let Model;
  let User;
  let Validate;
  let ValidateError;

  before(() => {
    ({ Model, Validate } = new Knorm());

    Validate = Model.Validate;
    ValidateError = Validate.ValidateError;

    User = class extends Model {};
    User.fields = ['id'];
  });

  let validate;

  beforeEach(() => {
    const user = new User();
    validate = new Validate(user, User.fields.id);
  });

  describe('Validate.prototype.validate', () => {
    it('validates the value against the spec', async () => {
      await expect(
        validate.validate('foo', { number: true }),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('converts a string into a validator object spec', async () => {
      await expect(
        validate.validate('foo', 'number'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('runs the `required` validator first', async () => {
      await expect(
        validate.validate(null, { number: true, required: true }),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be set and not null'
        })
      );
    });

    it('runs the `required` validator if the value is `undefined`', async () => {
      await expect(
        validate.validate(undefined, { required: true }),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be set and not null'
        })
      );
    });

    it('runs the `required` validator if the value is `null`', async () => {
      await expect(
        validate.validate(null, { required: true }),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be set and not null'
        })
      );
    });

    it('runs the `custom` validator last', async () => {
      await expect(
        validate.validate('foo', {
          custom() {
            throw new Error('foo');
          },
          number: true
        }),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('runs the `custom` validator if the value is `undefined`', async () => {
      await expect(
        validate.validate(undefined, {
          custom() {
            throw new Error('foo');
          }
        }),
        'to be rejected with error satisfying',
        new Error('foo')
      );
    });

    it('runs the `custom` validator if the value is `null`', async () => {
      await expect(
        validate.validate(null, {
          custom() {
            throw new Error('foo');
          }
        }),
        'to be rejected with error satisfying',
        new Error('foo')
      );
    });

    it('does not run other validators if the value is `undefined`', async () => {
      await expect(
        validate.validate(undefined, { number: true }),
        'to be fulfilled'
      );
    });

    it('does not run other validators if the value is `null`', async () => {
      await expect(
        validate.validate(null, { number: true }),
        'to be fulfilled'
      );
    });

    it('rejects if the validator spec contains unknown keys', async () => {
      await expect(
        validate.validate('foo', { foo: 'foo' }),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: "unknown validator 'foo'" })
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not reject if the value does not pass validation', async () => {
        await expect(
          validate.validate(undefined, 'required'),
          'to be fulfilled'
        );
      });

      it('rejects if the value passes validation', async () => {
        await expect(
          validate.validate('foo', 'string'),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a string'
          })
        );
      });
    });
  });

  describe('Validate.prototype.required', () => {
    it('rejects if the value is `undefined`', async () => {
      await expect(
        validate.required(undefined),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be set and not null'
        })
      );
    });

    it('rejects if the value is `null`', async () => {
      await expect(
        validate.required(null),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be set and not null'
        })
      );
    });

    it('does not throw if the value is not undefined or null', async () => {
      await expect(validate.required({}), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is `undefined`', async () => {
        await expect(validate.required(undefined), 'to be fulfilled');
      });

      it('does not throw if the value is `null`', async () => {
        await expect(validate.required(null), 'to be fulfilled');
      });

      it('rejects if the value is not undefined or null', async () => {
        await expect(
          validate.required(true),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should be unset or null'
          })
        );
      });
    });
  });

  describe('Validate.prototype.number', () => {
    it('rejects if the value is not a number', async () => {
      await expect(
        validate.number('1'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('rejects if the value is `NaN`', async () => {
      await expect(
        validate.number(NaN),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('rejects if the value is `Infinity`', async () => {
      await expect(
        validate.number(Infinity),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('rejects if the value is `-Infinity`', async () => {
      await expect(
        validate.number(-Infinity),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('rejects if the value is an instance of `Number`', async () => {
      expect(
        // eslint-disable-next-line no-new-wrappers
        () => validate.number(new Number(1)),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('does not throw if the value is a number', async () => {
      await expect(validate.number(1), 'to be fulfilled');
    });

    it('does not throw if the value is a finite exponential number', async () => {
      await expect(validate.number(11e31), 'to be fulfilled');
    });

    it('does not throw if the value is a float', async () => {
      await expect(validate.number(1.5), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a number', async () => {
        await expect(validate.number('foo'), 'to be fulfilled');
      });

      it('rejects if the value is a number', async () => {
        await expect(
          validate.number(1.5),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a number'
          })
        );
      });
    });
  });

  describe('Validate.prototype.integer', () => {
    it('rejects if the value is not an integer', async () => {
      await expect(
        validate.integer('1'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an integer' })
      );
    });

    it('rejects if the value is an instance of `Number`', async () => {
      await expect(
        // eslint-disable-next-line no-new-wrappers
        validate.integer(new Number(1)),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an integer' })
      );
    });

    it('rejects if the value is a float', async () => {
      await expect(
        validate.integer(1.5),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an integer' })
      );
    });

    it('does not throw if the value is an integer', async () => {
      await expect(validate.integer(1), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not an integer', async () => {
        await expect(validate.integer(1.2), 'to be fulfilled');
      });

      it('rejects if the value is an integer', async () => {
        await expect(
          validate.integer(1),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be an integer'
          })
        );
      });
    });
  });

  describe('Validate.prototype.string', () => {
    it('rejects if the value is not a string', async () => {
      await expect(
        validate.string(true),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a string' })
      );
    });

    it('rejects if the value is an instance of `String`', async () => {
      await expect(
        // eslint-disable-next-line no-new-wrappers
        validate.string(new String('foo')),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a string' })
      );
    });

    it('does not throw if the value is a string', async () => {
      await expect(validate.string('foo'), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a string', async () => {
        await expect(validate.string(true), 'to be fulfilled');
      });

      it('rejects if the value is a string', async () => {
        await expect(
          validate.string('foo'),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a string'
          })
        );
      });
    });
  });

  describe('Validate.prototype.boolean', () => {
    it('rejects if the value is not a boolean', async () => {
      await expect(
        validate.boolean('true'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a boolean' })
      );
    });

    it('rejects if the value is an instance of `Boolean`', async () => {
      await expect(
        // eslint-disable-next-line no-new-wrappers
        validate.boolean(new Boolean(true)),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a boolean' })
      );
    });

    it('does not throw if the value is a boolean', async () => {
      await expect(validate.boolean(false), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a boolean', async () => {
        await expect(validate.boolean('foo'), 'to be fulfilled');
      });

      it('rejects if the value is a boolean', async () => {
        await expect(
          validate.boolean(true),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a boolean'
          })
        );
      });
    });
  });

  describe('Validate.prototype.email', () => {
    it('rejects if the value is not an email', async () => {
      await expect(
        validate.email('foo.com'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an email' })
      );
    });

    it('does not throw if the value is an email', async () => {
      await expect(validate.email('foo@bar.com'), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not an email', async () => {
        await expect(validate.email('foo'), 'to be fulfilled');
      });

      it('rejects if the value is an email', async () => {
        await expect(
          validate.email('foo@bar.com'),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be an email'
          })
        );
      });
    });
  });

  describe('Validate.prototype.uuid', () => {
    it('rejects if the value is not a UUID', async () => {
      await expect(
        validate.uuid('foo'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a UUID' })
      );
    });

    it('does not throw if the value is a v1 UUID', async () => {
      await expect(validate.uuid(uuid1()), 'to be fulfilled');
    });

    it('does not throw if the value is a v3 UUID', async () => {
      await expect(
        validate.uuid(uuid3('foo.com', uuid3.DNS)),
        'to be fulfilled'
      );
    });

    it('does not throw if the value is a v4 UUID', async () => {
      await expect(validate.uuid(uuid4()), 'to be fulfilled');
    });

    it('does not throw if the value is a v5 UUID', async () => {
      await expect(
        validate.uuid(uuid5('foo.com', uuid5.DNS)),
        'to be fulfilled'
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a UUID', async () => {
        await expect(validate.uuid('foo'), 'to be fulfilled');
      });

      it('rejects if the value is a UUID', async () => {
        await expect(
          validate.uuid(uuid1()),
          'to be rejected with error satisfying',
          new ValidateError({ validate, message: 'value should not be a UUID' })
        );
      });
    });
  });

  describe('Validate.prototype.uuid3', () => {
    it('rejects if the value is not a UUID', async () => {
      await expect(
        validate.uuid3('foo'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v3 UUID' })
      );
    });

    it('rejects if the value is a v1 UUID', async () => {
      await expect(
        validate.uuid3(uuid1()),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v3 UUID' })
      );
    });

    it('rejects if the value is a v4 UUID', async () => {
      await expect(
        validate.uuid3(uuid4()),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v3 UUID' })
      );
    });

    it('rejects if the value is a v5 UUID', async () => {
      await expect(
        validate.uuid3(uuid5('foo.com', uuid5.DNS)),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v3 UUID' })
      );
    });

    it('does not throw if the value is a v3 UUID', async () => {
      await expect(
        validate.uuid3(uuid3('foo.com', uuid3.DNS)),
        'to be fulfilled'
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a v3 uuid', async () => {
        await expect(validate.uuid3('foo'), 'to be fulfilled');
      });

      it('rejects if the value is a v3 uuid', async () => {
        await expect(
          validate.uuid3(uuid3('foo.com', uuid3.DNS)),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a v3 UUID'
          })
        );
      });
    });
  });

  describe('Validate.prototype.uuid4', () => {
    it('rejects if the value is not a UUID', async () => {
      await expect(
        validate.uuid4('foo'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v4 UUID' })
      );
    });

    it('rejects if the value is a v1 UUID', async () => {
      await expect(
        validate.uuid4(uuid1()),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v4 UUID' })
      );
    });

    it('rejects if the value is a v3 UUID', async () => {
      await expect(
        validate.uuid4(uuid3('foo.com', uuid3.DNS)),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v4 UUID' })
      );
    });

    it('rejects if the value is a v5 UUID', async () => {
      await expect(
        validate.uuid4(uuid5('foo.com', uuid5.DNS)),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v4 UUID' })
      );
    });

    it('does not throw if the value is a v4 UUID', async () => {
      await expect(validate.uuid4(uuid4()), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a v4 UUID', async () => {
        await expect(validate.uuid4('foo'), 'to be fulfilled');
      });

      it('rejects if the value is a v4 UUID', async () => {
        await expect(
          validate.uuid4(uuid4()),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a v4 UUID'
          })
        );
      });
    });
  });

  describe('Validate.prototype.uuid5', () => {
    it('rejects if the value is not a UUID', async () => {
      await expect(
        validate.uuid5('foo'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v5 UUID' })
      );
    });

    it('rejects if the value is a v1 UUID', async () => {
      await expect(
        validate.uuid5(uuid1()),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v5 UUID' })
      );
    });

    it('rejects if the value is a v3 UUID', async () => {
      await expect(
        validate.uuid5(uuid3('foo.com', uuid3.DNS)),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v5 UUID' })
      );
    });

    it('rejects if the value is a v4 UUID', async () => {
      await expect(
        validate.uuid5(uuid4()),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a v5 UUID' })
      );
    });

    it('does not throw if the value is a v5 UUID', async () => {
      await expect(
        validate.uuid5(uuid5('foo.com', uuid5.DNS)),
        'to be fulfilled'
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a v5 UUID', async () => {
        await expect(validate.uuid5('foo'), 'to be fulfilled');
      });

      it('rejects if the value is a v5 UUID', async () => {
        await expect(
          validate.uuid5(uuid5('foo.com', uuid5.DNS)),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a v5 UUID'
          })
        );
      });
    });
  });

  describe('Validate.prototype.date', () => {
    it('rejects if the value is not a Date instance', async () => {
      await expect(
        validate.date('1970-01-01'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a date' })
      );
    });

    it('does not throw if the value is a Date instance', async () => {
      await expect(validate.date(new Date()), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a date', async () => {
        await expect(validate.date('foo'), 'to be fulfilled');
      });

      it('rejects if the value is a date', async () => {
        await expect(
          validate.date(new Date()),
          'to be rejected with error satisfying',
          new ValidateError({ validate, message: 'value should not be a date' })
        );
      });
    });
  });

  describe('Validate.prototype.object', () => {
    it('rejects if the value is not an object', async () => {
      await expect(
        validate.object('foo'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an object' })
      );
    });

    it('rejects if the value is `null`', async () => {
      await expect(
        validate.object(null),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an object' })
      );
    });

    it('rejects if the value is not an array', async () => {
      await expect(
        validate.object([]),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an object' })
      );
    });

    it('does not throw if the value is an object', async () => {
      await expect(validate.object({}), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not an object', async () => {
        await expect(validate.object('foo'), 'to be fulfilled');
      });

      it('rejects if the value is an object', async () => {
        await expect(
          validate.object({}),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be an object'
          })
        );
      });
    });
  });

  describe('Validate.prototype.array', () => {
    it('rejects if the value is not an array', async () => {
      await expect(
        validate.array('foo'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an array' })
      );
    });

    it('rejects if the value is an object', async () => {
      await expect(
        validate.array({}),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an array' })
      );
    });

    it('does not throw if the value is an array', async () => {
      await expect(validate.array([]), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not an array', async () => {
        await expect(validate.array('foo'), 'to be fulfilled');
      });

      it('rejects if the value is an array', async () => {
        await expect(
          validate.array([]),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be an array'
          })
        );
      });
    });
  });

  describe('Validate.prototype.buffer', () => {
    it('rejects if the value is not a Buffer instance', async () => {
      await expect(
        validate.buffer('foo'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a buffer' })
      );
    });

    it('does not throw if the value is a Buffer instance', async () => {
      await expect(validate.buffer(Buffer.from('foo')), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not a buffer', async () => {
        await expect(validate.buffer('foo'), 'to be fulfilled');
      });

      it('rejects if the value is a buffer', async () => {
        await expect(
          validate.buffer(Buffer.from('foo')),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a buffer'
          })
        );
      });
    });
  });

  describe('Validate.prototype.equalTo', () => {
    it('rejects if the value is not equal to the expected value', async () => {
      await expect(
        validate.equalTo('foo', 'bar'),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value should be equal to 'bar'"
        })
      );
    });

    it('rejects if objects are compared for equality', async () => {
      await expect(
        validate.equalTo({}, {}),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be equal to {}' })
      );
    });

    it('compares strings case-sensitively', async () => {
      await expect(
        validate.equalTo('foo', 'FOO'),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value should be equal to 'FOO'"
        })
      );
    });

    it('compares values with strict equality', async () => {
      await expect(
        validate.equalTo(1, '1'),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value should be equal to '1'"
        })
      );
    });

    it('does not throw if the value is equal to the expected value', async () => {
      await expect(validate.equalTo('foo', 'foo'), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not equal to the expected value', async () => {
        await expect(validate.equalTo(1, 2), 'to be fulfilled');
      });

      it('rejects if the value is equal to the expected value', async () => {
        await expect(
          validate.equalTo(1, 1),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be equal to 1'
          })
        );
      });
    });
  });

  describe('Validate.prototype.greaterThan', () => {
    it('rejects if the value is less than the expected value', async () => {
      await expect(
        validate.greaterThan(10, 20),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be greater than 20'
        })
      );
    });

    it('rejects if the value is equal to the expected value', async () => {
      await expect(
        validate.greaterThan(10, 10),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be greater than 10'
        })
      );
    });

    it('does not throw if the value is greater than the expected value', async () => {
      await expect(validate.greaterThan(10.01, 10), 'to be fulfilled');
    });

    it('does not throw if a string is alphabetically greater than the expected value', async () => {
      await expect(validate.greaterThan('a', 'A'), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not greater than the expected value', async () => {
        await expect(validate.greaterThan(1, 2), 'to be fulfilled');
      });

      it('rejects if the value is greater than the expected value', async () => {
        await expect(
          validate.greaterThan(2, 1),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be greater than 1'
          })
        );
      });
    });
  });

  describe('Validate.prototype.greaterThanOrEqualTo', () => {
    it('rejects if the value is less than the expected value', async () => {
      await expect(
        validate.greaterThanOrEqualTo(10, 20),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be greater than or equal to 20'
        })
      );
    });

    it('does not throw if the value is greater than the expected value', async () => {
      await expect(validate.greaterThanOrEqualTo(10.01, 10), 'to be fulfilled');
    });

    it('does not throw if the value is equal to the expected value', async () => {
      await expect(validate.greaterThanOrEqualTo(10, 10), 'to be fulfilled');
    });

    it('does not throw if a string is alphabetically greater than the expected value', async () => {
      await expect(
        validate.greaterThanOrEqualTo('foo', 'Foo'),
        'to be fulfilled'
      );
    });

    it('does not throw if a string is alphabetically equal to the expected value', async () => {
      await expect(
        validate.greaterThanOrEqualTo('foo', 'foo'),
        'to be fulfilled'
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not greater than or equal to the expected value', async () => {
        await expect(validate.greaterThanOrEqualTo(1, 2), 'to be fulfilled');
      });

      it('rejects if the value is greater than or equal to the expected value', async () => {
        await expect(
          validate.greaterThanOrEqualTo(1, 1),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be greater than or equal to 1'
          })
        );
      });
    });
  });

  describe('Validate.prototype.lessThan', () => {
    it('rejects if the value is greater than the expected value', async () => {
      await expect(
        validate.lessThan(20, 10),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be less than 10'
        })
      );
    });

    it('rejects if the value is equal to the expected value', async () => {
      await expect(
        validate.lessThan(10, 10),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be less than 10'
        })
      );
    });

    it('does not throw if the value is less than the expected value', async () => {
      await expect(validate.lessThan(9, 10), 'to be fulfilled');
    });

    it('does not throw if a string is alphabetically less than the expected value', async () => {
      await expect(validate.lessThan('a', 'b'), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not less than the expected value', async () => {
        await expect(validate.lessThan(3, 2), 'to be fulfilled');
      });

      it('rejects if the value is less than the expected value', async () => {
        await expect(
          validate.lessThan(1, 2),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be less than 2'
          })
        );
      });
    });
  });

  describe('Validate.prototype.lessThanOrEqualTo', () => {
    it('rejects if the value is greater than the expected value', async () => {
      await expect(
        validate.lessThanOrEqualTo(20, 10),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should be less than or equal to 10'
        })
      );
    });

    it('does not throw if the value is less than the expected value', async () => {
      await expect(validate.lessThanOrEqualTo(1, 10), 'to be fulfilled');
    });

    it('does not throw if the value is equal to the expected value', async () => {
      await expect(validate.lessThanOrEqualTo(10, 10), 'to be fulfilled');
    });

    it('does not throw if a string is alphabetically less than the expected value', async () => {
      await expect(validate.lessThanOrEqualTo('A', 'a'), 'to be fulfilled');
    });

    it('does not throw if a string is alphabetically equal to the expected value', async () => {
      await expect(validate.lessThanOrEqualTo('foo', 'foo'), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not less than or equal to the expected value', async () => {
        await expect(validate.lessThanOrEqualTo(4, 2), 'to be fulfilled');
      });

      it('rejects if the value is less than or equal to the expected value', async () => {
        await expect(
          validate.lessThanOrEqualTo(0, 1),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be less than or equal to 1'
          })
        );
      });
    });
  });

  describe('Validate.prototype.lengthEqualTo', () => {
    it("rejects if the value's length is not equal to the expected length", async () => {
      await expect(
        validate.lengthEqualTo('foo', 1),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value's length should be equal to 1"
        })
      );
    });

    it("does not throw if the value's length is equal to the expected length", async () => {
      await expect(validate.lengthEqualTo([1, 2, 3], 3), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it("does not throw if the value's length is not equal to the expected length", async () => {
        await expect(validate.lengthEqualTo('foo', 2), 'to be fulfilled');
      });

      it("rejects if the value's length is equal to the expected length", async () => {
        await expect(
          validate.lengthEqualTo('foo', 3),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: "value's length should not be equal to 3"
          })
        );
      });
    });
  });

  describe('Validate.prototype.lengthGreaterThan', () => {
    it("rejects if the value's length is less than the expected length", async () => {
      await expect(
        validate.lengthGreaterThan('foo', 4),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value's length should be greater than 4"
        })
      );
    });

    it("rejects if the value's length is equal to the expected length", async () => {
      await expect(
        validate.lengthGreaterThan([1, 2, 3], 3),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value's length should be greater than 3"
        })
      );
    });

    it("does not throw if the value's length is greater than the expected length", async () => {
      await expect(validate.lengthGreaterThan('foo', 1), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it("does not throw if the value's length is not greater than the expected length", async () => {
        await expect(validate.lengthGreaterThan('foo', 4), 'to be fulfilled');
      });

      it("rejects if the value's length is greater than the expected length", async () => {
        await expect(
          validate.lengthGreaterThan('foo', 1),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: "value's length should not be greater than 1"
          })
        );
      });
    });
  });

  describe('Validate.prototype.lengthGreaterThanOrEqualTo', () => {
    it("rejects if the value's length is less than the expected value", async () => {
      await expect(
        validate.lengthGreaterThanOrEqualTo('foo', 4),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value's length should be greater than or equal to 4"
        })
      );
    });

    it("does not throw if the value's length is greater than the expected value", async () => {
      await expect(
        validate.lengthGreaterThanOrEqualTo([1, 2, 3, 4], 3),
        'to be fulfilled'
      );
    });

    it("does not throw if the value's length is equal to the expected value", async () => {
      await expect(
        validate.lengthGreaterThanOrEqualTo('foo', 3),
        'to be fulfilled'
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it("does not throw if the value's length is not greater than or equal to the expected length", async () => {
        await expect(
          validate.lengthGreaterThanOrEqualTo('foo', 4),
          'to be fulfilled'
        );
      });

      it("rejects if the value's length is greater than or equal to the expected length", async () => {
        await expect(
          validate.lengthGreaterThanOrEqualTo('foo', 3),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: "value's length should not be greater than or equal to 3"
          })
        );
      });
    });
  });

  describe('Validate.prototype.lengthLessThan', () => {
    it("rejects if the value's length is greater than the expected value", async () => {
      await expect(
        validate.lengthLessThan('foo', 2),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value's length should be less than 2"
        })
      );
    });

    it("rejects if the value's length is equal to the expected value", async () => {
      await expect(
        validate.lengthLessThan([1, 2, 3], 3),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value's length should be less than 3"
        })
      );
    });

    it("does not throw if the value's length is less than the expected value", async () => {
      await expect(validate.lengthLessThan('foo', 4), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it("does not throw if the value's length is not less than the expected length", async () => {
        await expect(validate.lengthLessThan('foo', 2), 'to be fulfilled');
      });

      it("rejects if the value's length is less than the expected length", async () => {
        await expect(
          validate.lengthLessThan('foo', 4),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: "value's length should not be less than 4"
          })
        );
      });
    });
  });

  describe('Validate.prototype.lengthLessThanOrEqualTo', () => {
    it("rejects if the value's length is greater than the expected value", async () => {
      await expect(
        validate.lengthLessThanOrEqualTo('foo', 2),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value's length should be less than or equal to 2"
        })
      );
    });

    it("does not throw if the value's length is less than the expected value", async () => {
      await expect(validate.lengthLessThanOrEqualTo([1], 2), 'to be fulfilled');
    });

    it("does not throw if the value's length is equal to the expected value", async () => {
      await expect(
        validate.lengthLessThanOrEqualTo([1, 2], 2),
        'to be fulfilled'
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it("does not throw if the value's length is not less than or equal to the expected length", async () => {
        await expect(
          validate.lengthLessThanOrEqualTo('foo', 2),
          'to be fulfilled'
        );
      });

      it("rejects if the value's length is less than or equal to the expected length", async () => {
        await expect(
          validate.lengthLessThanOrEqualTo('foo', 4),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: "value's length should not be less than or equal to 4"
          })
        );
      });
    });
  });

  describe('Validate.prototype.oneOf', () => {
    it('rejects if the value is not included in the list of expected values', async () => {
      await expect(
        validate.oneOf('foo', ['bar', 'baz']),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value should be one of [ 'bar', 'baz' ]"
        })
      );
    });

    it('compares strings case-sensitively', async () => {
      await expect(
        validate.oneOf('foo', ['Foo', 'baz']),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value should be one of [ 'Foo', 'baz' ]"
        })
      );
    });

    it('compares values with strict equality', async () => {
      await expect(
        validate.oneOf(1, ['1', 2]),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: "value should be one of [ '1', 2 ]"
        })
      );
    });

    it('does not throw if the value is included in the list of expected values', async () => {
      await expect(validate.oneOf(1, [1, 2]), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value is not one of the expected values', async () => {
        await expect(validate.oneOf(1, [2, 3]), 'to be fulfilled');
      });

      it('rejects if the value is one of the expected values', async () => {
        await expect(
          validate.oneOf(1, [1, 2]),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be one of [ 1, 2 ]'
          })
        );
      });
    });
  });

  describe('Validate.prototype.match', () => {
    it('rejects if the value does not match the regex', async () => {
      await expect(
        validate.match('foo', /bar/),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should match /bar/'
        })
      );
    });

    it('does not throw if the value matches the regex', async () => {
      await expect(validate.match('a', /[a-c]/), 'to be fulfilled');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if the value does not match the regex', async () => {
        await expect(validate.match('foo', /bar/), 'to be fulfilled');
      });

      it('rejects if the value matches the regex', async () => {
        await expect(
          validate.match('foo', /foo/),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not match /foo/'
          })
        );
      });
    });
  });

  describe('Validate.prototype.item', () => {
    it('rejects if any item in the array fails validation', async () => {
      await expect(
        validate.item(['foo', 'bar'], { match: /foo/ }),
        'to be rejected with error satisfying',
        'User.fields.id[1]: value should match /foo/'
      );
    });

    it('includes the index of the item in the error message', async () => {
      await expect(
        validate.item(
          [{ foo: ['foo'] }, { foo: ['foo'] }, { foo: ['foo', 'bar'] }],
          {
            shape: { foo: { item: { equalTo: 'foo' } } }
          }
        ),
        'to be rejected with error satisfying',
        "User.fields.id[2].foo[1]: value should be equal to 'foo'"
      );
    });

    it('restores the path after a successful validation', async () => {
      await expect(validate.path, 'to be', 'User.fields.id');
      await expect(validate.item(['foo'], 'string'), 'to be fulfilled');
      await expect(validate.path, 'to be', 'User.fields.id');
    });

    it('restores the path after a failed validation', async () => {
      await expect(validate.path, 'to be', 'User.fields.id');
      await expect(validate.item(['foo', 1], 'string'), 'to be rejected');
      await expect(validate.path, 'to be', 'User.fields.id');
    });

    it('fulfils if all items pass validation', async () => {
      await expect(
        validate.item(['a', 'b', 'c'], { match: /[a-c]/ }),
        'to be fulfilled'
      );
      await expect(validate.path, 'to be', 'User.fields.id');
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not reject if all items in the array fail validation', async () => {
        await expect(
          validate.item(['foo', 'bar'], { equalTo: 'quux' }),
          'to be fulfilled'
        );
      });

      it('rejects if any item in the array passes validation', async () => {
        expect(
          validate.item(['foo', 'bar'], { match: /foo?/ }),
          'to be rejected with error satisfying',
          'User.fields.id[0]: value should not match /foo?/'
        );
      });
    });
  });

  describe('Validate.prototype.shape', () => {
    it('rejects if an object property specified in the shape fails validation', async () => {
      await expect(
        validate.shape({ id: 1, name: 1 }, { id: 'integer', name: 'string' }),
        'to be rejected with error satisfying',
        'User.fields.id.name: value should be a string'
      );
    });

    it('includes the path to the property in the error message', async () => {
      await expect(
        validate.shape(
          { foo: { bar: 'foo' } },
          { foo: { shape: { bar: 'boolean' } } }
        ),
        'to be rejected with error satisfying',
        'User.fields.id.foo.bar: value should be a boolean'
      );
    });

    it('restores the path after a successful validation', async () => {
      await expect(validate.path, 'to be', 'User.fields.id');
      await expect(
        validate.shape({ foo: 'foo' }, { foo: 'string' }),
        'to be fulfilled'
      );
      await expect(validate.path, 'to be', 'User.fields.id');
    });

    it('restores the path after a failed validation', async () => {
      await expect(validate.path, 'to be', 'User.fields.id');
      await expect(
        validate.shape({ foo: 1 }, { foo: 'string' }),
        'to be rejected'
      );
      await expect(validate.path, 'to be', 'User.fields.id');
    });

    it('fulfils if the object satisfies the provided shape', async () => {
      await expect(
        validate.shape({ foo: 'foo' }, { foo: 'string' }),
        'to be fulfilled'
      );
    });

    it('ignores properties in the object not described in the shape', async () => {
      await expect(
        validate.shape({ foo: 'foo', bar: 'bar' }, { foo: 'string' }),
        'to be fulfilled'
      );
    });

    it('ignores properties described in the shape but not in the object', async () => {
      await expect(
        validate.shape({ foo: 'foo' }, { foo: 'string', bar: 'string' }),
        'to be fulfilled'
      );
    });

    it('rejects if properties marked required in the shape are not included in the object', async () => {
      await expect(
        validate.shape({ foo: 'foo' }, { foo: 'string', bar: 'required' }),
        'to be rejected with error satisfying',
        'User.fields.id.bar: value should be set and not null'
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not reject if the object does not satisfy the provided shape', async () => {
        await expect(
          validate.shape({ foo: 1 }, { foo: 'string' }),
          'to be fulfilled'
        );
      });

      it('rejects if the object satisfies the provided shape', async () => {
        await expect(
          validate.shape({ foo: 'foo' }, { foo: 'string' }),
          'to be rejected with error satisfying',
          'User.fields.id.foo: value should not be a string'
        );
      });
    });
  });

  describe('Validate.prototype.or', () => {
    it('fulfils if the value passes validation against at least one spec', async () => {
      await expect(validate.or('foo', ['number', 'string']), 'to be fulfilled');
    });

    it('stops validating as soon as the value passes validation against a spec', async () => {
      const custom = sinon.spy();
      await expect(
        validate.or('foo', ['number', 'string', { custom }]),
        'to be fulfilled'
      );
      await expect(custom, 'was not called');
    });

    it('supports passing a single spec', async () => {
      await expect(validate.or('foo', 'string'), 'to be fulfilled');
    });

    it('rejects with the first error if the value fails validation against all specs', async () => {
      await expect(
        validate.or(1.5, ['integer', 'string', 'boolean']),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an integer' })
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not reject if the value fails validation against all specs', async () => {
        await expect(validate.or({}, ['number', 'string']), 'to be fulfilled');
      });

      it('rejects if the value passes validation against all specs', async () => {
        await expect(
          validate.or(1, ['number', 'integer']),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a number'
          })
        );
      });
    });
  });

  describe('Validate.prototype.and', () => {
    it('fulfils if the value passes validation against all the specs', async () => {
      await expect(
        validate.and(1.5, ['required', 'number']),
        'to be fulfilled'
      );
    });

    it('supports passing a single spec', async () => {
      await expect(validate.and(1.5, 'required'), 'to be fulfilled');
    });

    it('supports validating against multiple `or` specs', async () => {
      await expect(
        validate.and('foo', [
          { or: ['number', 'string'] },
          { or: ['required', 'integer'] },
          { or: { not: 'number' } }
        ]),
        'to be fulfilled'
      );
    });

    it('rejects if the value fails validation against any of the specs', async () => {
      await expect(
        validate.and(1.5, ['required', { not: 'string' }, 'integer']),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be an integer' })
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not reject if the value fails validation against any of specs', async () => {
        await expect(validate.and({}, ['number', 'string']), 'to be fulfilled');
      });

      it('rejects if the value passes validation against all specs', async () => {
        await expect(
          validate.and(1, ['number', 'integer']),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a number'
          })
        );
      });
    });
  });

  describe('Validate.prototype.not', () => {
    it('fulfils if the value fails validation against the spec', async () => {
      await expect(validate.not(1.5, 'string'), 'to be fulfilled');
    });

    it('rejects if the value passes validation against the spec', async () => {
      await expect(
        validate.not(1.5, 'number'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should not be a number' })
      );
    });

    it('restores negation after a successful validation', async () => {
      await expect(validate.negate, 'to be false');
      await expect(validate.not('foo', 'number'), 'to be fulfilled');
      await expect(validate.negate, 'to be false');
    });

    it('restores negation after a failed validation', async () => {
      await expect(validate.negate, 'to be false');
      await expect(validate.not(1, 'number'), 'to be rejected');
      await expect(validate.negate, 'to be false');
    });
  });

  describe('Validate.prototype.custom', () => {
    it('rejects if the function returns `false`', async () => {
      await expect(
        validate.custom('foo', () => false),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should pass custom validation'
        })
      );
    });

    it('rejects with the error thrown if the function throws', async () => {
      await expect(
        validate.custom('foo', async () => {
          throw new Error('foo');
        }),
        'to be rejected with error satisfying',
        new Error('foo')
      );
    });

    it('fulfills if the function returns `true`', async () => {
      await expect(validate.custom('foo', () => true), 'to be fulfilled');
    });

    it('fulfills if the function returns `undefined`', async () => {
      await expect(validate.custom('foo', async () => {}), 'to be fulfilled');
    });

    it('rejects if the function resolves with `false`', async () => {
      await expect(
        validate.custom('foo', async () => false),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'value should pass custom validation'
        })
      );
    });

    it('rejects with the rejection reason if the function rejects', async () => {
      await expect(
        validate.custom('foo', async () => Promise.reject(new Error('foo'))),
        'to be rejected with error satisfying',
        new Error('foo')
      );
    });

    it('fulfills if the function resolves with `true`', async () => {
      await expect(validate.custom('foo', async () => true), 'to be fulfilled');
    });

    it('fulfills if the function resolves with `undefined`', async () => {
      await expect(validate.custom('foo', async () => {}), 'to be fulfilled');
    });

    it('calls the function with the value and the validate instance', async () => {
      const custom = sinon.spy();
      await expect(validate.custom('foo', custom), 'to be fulfilled');
      await expect(custom, 'to have calls satisfying', () =>
        custom('foo', validate)
      );
    });

    it('supports returning a new `validate` object spec', async () => {
      await expect(
        validate.custom('foo', async () => ({ number: true })),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    it('supports returning a new `validate` string spec', async () => {
      await expect(
        validate.custom('foo', async () => 'number'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'value should be a number' })
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not reject if the value fails custom validation', async () => {
        await expect(validate.custom('foo', () => false), 'to be fulfilled');
      });

      it('rejects if the value passes custom validation', async () => {
        await expect(
          validate.custom('foo', () => true),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not pass custom validation'
          })
        );
      });

      it('rejects with the right error if the validator returns a new validation spec', async () => {
        await expect(
          validate.custom('foo', () => 'string'),
          'to be rejected with error satisfying',
          new ValidateError({
            validate,
            message: 'value should not be a string'
          })
        );
      });
    });
  });

  describe('Validate.prototype.throwValidateErrorIf', () => {
    it('rejects the message ValidateError if `invalid` is `false`', () => {
      expect(
        () =>
          validate.throwValidateErrorIf(
            true,
            'should be foo',
            'should not be foo'
          ),
        'to throw',
        new ValidateError({ validate, message: 'should be foo' })
      );
    });

    it('does not throw a ValidateError if `invalid` is `false`', () => {
      expect(
        () =>
          validate.throwValidateErrorIf(
            false,
            'should be foo',
            'should not be foo'
          ),
        'not to throw'
      );
    });

    describe('when negated', () => {
      beforeEach(() => {
        validate.negate = true;
      });

      it('does not throw if `invalid` is `true`', () => {
        expect(
          () =>
            validate.throwValidateErrorIf(
              true,
              'should be foo',
              'should not be foo'
            ),
          'not to throw'
        );
      });

      it('rejects the negated message if `invalid` is `false`', () => {
        expect(
          () =>
            validate.throwValidateErrorIf(
              false,
              'should be foo',
              'should not be foo'
            ),
          'to throw',
          new ValidateError({ validate, message: 'should not be foo' })
        );
      });
    });
  });

  describe('Validate.prototype.throwValidateError', () => {
    it('rejects a ValidateError', () => {
      expect(
        () => validate.throwValidateError('foo'),
        'to throw',
        new ValidateError({ validate, message: 'foo' })
      );
    });
  });
});
