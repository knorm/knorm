const uuidv1 = require('uuid/v1');
const uuidv3 = require('uuid/v3');
const uuidv4 = require('uuid/v4');
const uuidv5 = require('uuid/v5');
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
    User.fields = { id: 'integer' };
  });

  let validate;

  beforeEach(() => {
    const user = new User();
    validate = new Validate(user, User.fields.id);
  });

  describe('Validate.prototype.throwValidateError', () => {
    it('throws a ValidateError', () => {
      expect(
        () => validate.throwValidateError('foo'),
        'to throw',
        new ValidateError({ validate, message: 'foo' })
      );
    });
  });

  describe('Validate.prototype.required', () => {
    it('throws if the value is `undefined`', () => {
      expect(
        () => validate.required(undefined),
        'to throw',
        new ValidateError({ validate, message: 'missing required value' })
      );
    });

    it('throws if the value is `null`', () => {
      expect(
        () => validate.required(null),
        'to throw',
        new ValidateError({ validate, message: 'missing required value' })
      );
    });

    it('does not throw if the value is not undefined', () => {
      expect(() => validate.required({}), 'not to throw');
    });
  });

  describe('Validate.prototype.number', () => {
    it('throws if the value is not a number', () => {
      expect(
        () => validate.number('1'),
        'to throw',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });

    it('throws if the value is `NaN`', () => {
      expect(
        () => validate.number(NaN),
        'to throw',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });

    it('throws if the value is `Infinity`', () => {
      expect(
        () => validate.number(Infinity),
        'to throw',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });

    it('throws if the value is `-Infinity`', () => {
      expect(
        () => validate.number(-Infinity),
        'to throw',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });

    it('throws if the value is an instance of `Number`', () => {
      expect(
        // eslint-disable-next-line no-new-wrappers
        () => validate.number(new Number(1)),
        'to throw',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });

    it('does not throw if the value is a number', () => {
      expect(() => validate.number(1), 'not to throw');
    });

    it('does not throw if the value is a finite exponential number', () => {
      expect(() => validate.number(11e31), 'not to throw');
    });

    it('does not throw if the value is a float', () => {
      expect(() => validate.number(1.5), 'not to throw');
    });
  });

  describe('Validate.prototype.integer', () => {
    it('throws if the value is not an integer', () => {
      expect(
        () => validate.integer('1'),
        'to throw',
        new ValidateError({ validate, message: 'expected an integer value' })
      );
    });

    it('throws if the value is an instance of `Number`', () => {
      expect(
        // eslint-disable-next-line no-new-wrappers
        () => validate.integer(new Number(1)),
        'to throw',
        new ValidateError({ validate, message: 'expected an integer value' })
      );
    });

    it('throws if the value is a float', () => {
      expect(
        () => validate.integer(1.5),
        'to throw',
        new ValidateError({ validate, message: 'expected an integer value' })
      );
    });

    it('does not throw if the value is an integer', () => {
      expect(() => validate.integer(1), 'not to throw');
    });
  });

  describe('Validate.prototype.string', () => {
    it('throws if the value is not a string', () => {
      expect(
        () => validate.string(true),
        'to throw',
        new ValidateError({ validate, message: 'expected a string value' })
      );
    });

    it('throws if the value is an instance of `String`', () => {
      expect(
        // eslint-disable-next-line no-new-wrappers
        () => validate.string(new String('foo')),
        'to throw',
        new ValidateError({ validate, message: 'expected a string value' })
      );
    });

    it('does not throw if the value is a string', () => {
      expect(() => validate.string('foo'), 'not to throw');
    });
  });

  describe('Validate.prototype.boolean', () => {
    it('throws if the value is not a boolean', () => {
      expect(
        () => validate.boolean('true'),
        'to throw',
        new ValidateError({ validate, message: 'expected a boolean value' })
      );
    });

    it('throws if the value is an instance of `Boolean`', () => {
      expect(
        // eslint-disable-next-line no-new-wrappers
        () => validate.boolean(new Boolean(true)),
        'to throw',
        new ValidateError({ validate, message: 'expected a boolean value' })
      );
    });

    it('does not throw if the value is a boolean', () => {
      expect(() => validate.boolean(false), 'not to throw');
    });
  });

  describe('Validate.prototype.email', () => {
    it('throws if the value is not an email', () => {
      expect(
        () => validate.email('foo.com'),
        'to throw',
        new ValidateError({ validate, message: 'expected an email value' })
      );
    });

    it('does not throw if the value is an email', () => {
      expect(() => validate.email('foo@bar.com'), 'not to throw');
    });
  });

  describe('Validate.prototype.uuid', () => {
    it('throws if the value is not a uuid', () => {
      expect(
        () => validate.uuid('foo'),
        'to throw',
        new ValidateError({ validate, message: 'expected a uuid value' })
      );
    });

    it('does not throw if the value is a V1 uuid', () => {
      expect(() => validate.uuid(uuidv1()), 'not to throw');
    });

    it('does not throw if the value is a V3 uuid', () => {
      expect(
        () => validate.uuid(uuidv3('foo.com', uuidv3.DNS)),
        'not to throw'
      );
    });

    it('does not throw if the value is a V4 uuid', () => {
      expect(() => validate.uuid(uuidv4()), 'not to throw');
    });

    it('does not throw if the value is a V5 uuid', () => {
      expect(
        () => validate.uuid(uuidv5('foo.com', uuidv5.DNS)),
        'not to throw'
      );
    });
  });

  describe('Validate.prototype.uuid3', () => {
    it('throws if the value is not a uuid', () => {
      expect(
        () => validate.uuid3('foo'),
        'to throw',
        new ValidateError({ validate, message: 'expected a v3 uuid value' })
      );
    });

    it('throws if the value is a V1 uuid', () => {
      expect(
        () => validate.uuid3(uuidv1()),
        'to throw',
        new ValidateError({ validate, message: 'expected a v3 uuid value' })
      );
    });

    it('throws if the value is a V4 uuid', () => {
      expect(
        () => validate.uuid3(uuidv4()),
        'to throw',
        new ValidateError({ validate, message: 'expected a v3 uuid value' })
      );
    });

    it('throws if the value is a V5 uuid', () => {
      expect(
        () => validate.uuid3(uuidv5('foo.com', uuidv5.DNS)),
        'to throw',
        new ValidateError({ validate, message: 'expected a v3 uuid value' })
      );
    });

    it('does not throw if the value is a V3 uuid', () => {
      expect(
        () => validate.uuid3(uuidv3('foo.com', uuidv3.DNS)),
        'not to throw'
      );
    });
  });

  describe('Validate.prototype.uuid4', () => {
    it('throws if the value is not a uuid', () => {
      expect(
        () => validate.uuid4('foo'),
        'to throw',
        new ValidateError({ validate, message: 'expected a v4 uuid value' })
      );
    });

    it('throws if the value is a V1 uuid', () => {
      expect(
        () => validate.uuid4(uuidv1()),
        'to throw',
        new ValidateError({ validate, message: 'expected a v4 uuid value' })
      );
    });

    it('throws if the value is a V3 uuid', () => {
      expect(
        () => validate.uuid4(uuidv3('foo.com', uuidv3.DNS)),
        'to throw',
        new ValidateError({ validate, message: 'expected a v4 uuid value' })
      );
    });

    it('throws if the value is a V5 uuid', () => {
      expect(
        () => validate.uuid4(uuidv5('foo.com', uuidv5.DNS)),
        'to throw',
        new ValidateError({ validate, message: 'expected a v4 uuid value' })
      );
    });

    it('does not throw if the value is a V4 uuid', () => {
      expect(() => validate.uuid4(uuidv4()), 'not to throw');
    });
  });

  describe('Validate.prototype.uuid5', () => {
    it('throws if the value is not a uuid', () => {
      expect(
        () => validate.uuid5('foo'),
        'to throw',
        new ValidateError({ validate, message: 'expected a v5 uuid value' })
      );
    });

    it('throws if the value is a V1 uuid', () => {
      expect(
        () => validate.uuid5(uuidv1()),
        'to throw',
        new ValidateError({ validate, message: 'expected a v5 uuid value' })
      );
    });

    it('throws if the value is a V3 uuid', () => {
      expect(
        () => validate.uuid5(uuidv3('foo.com', uuidv3.DNS)),
        'to throw',
        new ValidateError({ validate, message: 'expected a v5 uuid value' })
      );
    });

    it('throws if the value is a V4 uuid', () => {
      expect(
        () => validate.uuid5(uuidv4()),
        'to throw',
        new ValidateError({ validate, message: 'expected a v5 uuid value' })
      );
    });

    it('does not throw if the value is a V5 uuid', () => {
      expect(
        () => validate.uuid5(uuidv5('foo.com', uuidv5.DNS)),
        'not to throw'
      );
    });
  });

  describe('Validate.prototype.date', () => {
    it('throws if the value is not a Date instance', () => {
      expect(
        () => validate.date('1970-01-01'),
        'to throw',
        new ValidateError({ validate, message: 'expected a date value' })
      );
    });

    it('does not throw if the value is a Date instance', () => {
      expect(() => validate.date(new Date()), 'not to throw');
    });
  });

  describe('Validate.prototype.object', () => {
    it('throws if the value is not an object', () => {
      expect(
        () => validate.object('foo'),
        'to throw',
        new ValidateError({ validate, message: 'expected an object value' })
      );
    });

    it('throws if the value is `null`', () => {
      expect(
        () => validate.object(null),
        'to throw',
        new ValidateError({ validate, message: 'expected an object value' })
      );
    });

    it('throws if the value is not an array', () => {
      expect(
        () => validate.object([]),
        'to throw',
        new ValidateError({ validate, message: 'expected an object value' })
      );
    });

    it('does not throw if the value is an object', () => {
      expect(() => validate.object({}), 'not to throw');
    });
  });

  describe('Validate.prototype.array', () => {
    it('throws if the value is not an array', () => {
      expect(
        () => validate.array('foo'),
        'to throw',
        new ValidateError({ validate, message: 'expected an array value' })
      );
    });

    it('throws if the value is an object', () => {
      expect(
        () => validate.array({}),
        'to throw',
        new ValidateError({ validate, message: 'expected an array value' })
      );
    });

    it('does not throw if the value is an array', () => {
      expect(() => validate.array([]), 'not to throw');
    });
  });

  describe('Validate.prototype.buffer', () => {
    it('throws if the value is not a Buffer instance', () => {
      expect(
        () => validate.buffer('foo'),
        'to throw',
        new ValidateError({ validate, message: 'expected a buffer value' })
      );
    });

    it('does not throw if the value is a Buffer instance', () => {
      expect(() => validate.buffer(Buffer.from('foo')), 'not to throw');
    });
  });

  describe('Validate.prototype.equalTo', () => {
    it('throws if the value is not equal to the expected value', () => {
      expect(
        () => validate.equalTo('foo', 'bar'),
        'to throw',
        new ValidateError({
          validate,
          message: "expected a value equal to 'bar'"
        })
      );
    });

    it('throws if objects are compared for equality', () => {
      expect(
        () => validate.equalTo({}, {}),
        'to throw',
        new ValidateError({ validate, message: 'expected a value equal to {}' })
      );
    });

    it('compares strings case-sensitively', () => {
      expect(
        () => validate.equalTo('foo', 'FOO'),
        'to throw',
        new ValidateError({
          validate,
          message: "expected a value equal to 'FOO'"
        })
      );
    });

    it('compares values with strict equality', () => {
      expect(
        () => validate.equalTo(1, '1'),
        'to throw',
        new ValidateError({
          validate,
          message: "expected a value equal to '1'"
        })
      );
    });

    it('does not throw if the value is equal to the expected value', () => {
      expect(() => validate.equalTo('foo', 'foo'), 'not to throw');
    });
  });

  describe('Validate.prototype.greaterThan', () => {
    it('throws if the value is less than the expected value', () => {
      expect(
        () => validate.greaterThan(10, 20),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value greater than 20'
        })
      );
    });

    it('throws if the value is equal to the expected value', () => {
      expect(
        () => validate.greaterThan(10, 10),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value greater than 10'
        })
      );
    });

    it('does not throw if the value is greater than the expected value', () => {
      expect(() => validate.greaterThan(10.01, 10), 'not to throw');
    });

    it('does not throw if a string is alphabetically greater than the expected value', () => {
      expect(() => validate.greaterThan('a', 'A'), 'not to throw');
    });
  });

  describe('Validate.prototype.greaterThanOrEqualTo', () => {
    it('throws if the value is less than the expected value', () => {
      expect(
        () => validate.greaterThanOrEqualTo(10, 20),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value greater than or equal to 20'
        })
      );
    });

    it('does not throw if the value is greater than the expected value', () => {
      expect(() => validate.greaterThanOrEqualTo(10.01, 10), 'not to throw');
    });

    it('does not throw if the value is equal to the expected value', () => {
      expect(() => validate.greaterThanOrEqualTo(10, 10), 'not to throw');
    });

    it('does not throw if a string is alphabetically greater than the expected value', () => {
      expect(() => validate.greaterThanOrEqualTo('foo', 'Foo'), 'not to throw');
    });

    it('does not throw if a string is alphabetically equal to the expected value', () => {
      expect(() => validate.greaterThanOrEqualTo('foo', 'foo'), 'not to throw');
    });
  });

  describe('Validate.prototype.lessThan', () => {
    it('throws if the value is greater than the expected value', () => {
      expect(
        () => validate.lessThan(20, 10),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value less than 10'
        })
      );
    });

    it('throws if the value is equal to the expected value', () => {
      expect(
        () => validate.lessThan(10, 10),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value less than 10'
        })
      );
    });

    it('does not throw if the value is less than the expected value', () => {
      expect(() => validate.lessThan(9, 10), 'not to throw');
    });

    it('does not throw if a string is alphabetically less than the expected value', () => {
      expect(() => validate.lessThan('a', 'b'), 'not to throw');
    });
  });

  describe('Validate.prototype.lessThanOrEqualTo', () => {
    it('throws if the value is greater than the expected value', () => {
      expect(
        () => validate.lessThanOrEqualTo(20, 10),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value less than or equal to 10'
        })
      );
    });

    it('does not throw if the value is less than the expected value', () => {
      expect(() => validate.lessThanOrEqualTo(1, 10), 'not to throw');
    });

    it('does not throw if the value is equal to the expected value', () => {
      expect(() => validate.lessThanOrEqualTo(10, 10), 'not to throw');
    });

    it('does not throw if a string is alphabetically less than the expected value', () => {
      expect(() => validate.lessThanOrEqualTo('A', 'a'), 'not to throw');
    });

    it('does not throw if a string is alphabetically equal to the expected value', () => {
      expect(() => validate.lessThanOrEqualTo('foo', 'foo'), 'not to throw');
    });
  });

  describe('Validate.prototype.lengthEqualTo', () => {
    it("throws if the value's length is not equal to the expected length", () => {
      expect(
        () => validate.lengthEqualTo('foo', 1),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value whose length is equal to 1'
        })
      );
    });

    it("does not throw if the value's length is equal to the expected length", () => {
      expect(() => validate.lengthEqualTo([1, 2, 3], 3), 'not to throw');
    });
  });

  describe('Validate.prototype.lengthGreaterThan', () => {
    it("throws if the value's length is less than the expected length", () => {
      expect(
        () => validate.lengthGreaterThan('foo', 4),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value whose length is greater than 4'
        })
      );
    });

    it("throws if the value's length is equal to the expected length", () => {
      expect(
        () => validate.lengthGreaterThan([1, 2, 3], 3),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value whose length is greater than 3'
        })
      );
    });

    it("does not throw if the value's length is greater than the expected length", () => {
      expect(() => validate.lengthGreaterThan('foo', 1), 'not to throw');
    });
  });

  describe('Validate.prototype.lengthGreaterThanOrEqualTo', () => {
    it("throws if the value's length is less than the expected value", () => {
      expect(
        () => validate.lengthGreaterThanOrEqualTo('foo', 4),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value whose length is greater than or equal to 4'
        })
      );
    });

    it("does not throw if the value's length is greater than the expected value", () => {
      expect(
        () => validate.lengthGreaterThanOrEqualTo([1, 2, 3, 4], 3),
        'not to throw'
      );
    });

    it("does not throw if the value's length is equal to the expected value", () => {
      expect(
        () => validate.lengthGreaterThanOrEqualTo('foo', 3),
        'not to throw'
      );
    });
  });

  describe('Validate.prototype.lengthLessThan', () => {
    it("throws if the value's length is greater than the expected value", () => {
      expect(
        () => validate.lengthLessThan('foo', 2),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value whose length is less than 2'
        })
      );
    });

    it("throws if the value's length is equal to the expected value", () => {
      expect(
        () => validate.lengthLessThan([1, 2, 3], 3),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value whose length is less than 3'
        })
      );
    });

    it("does not throw if the value's length is less than the expected value", () => {
      expect(() => validate.lengthLessThan('foo', 4), 'not to throw');
    });
  });

  describe('Validate.prototype.lengthLessThanOrEqualTo', () => {
    it("throws if the value's length is greater than the expected value", () => {
      expect(
        () => validate.lengthLessThanOrEqualTo('foo', 2),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value whose length is less than or equal to 2'
        })
      );
    });

    it("does not throw if the value's length is less than the expected value", () => {
      expect(() => validate.lengthLessThanOrEqualTo([1], 2), 'not to throw');
    });

    it("does not throw if the value's length is equal to the expected value", () => {
      expect(() => validate.lengthLessThanOrEqualTo([1, 2], 2), 'not to throw');
    });
  });

  describe('Validate.prototype.oneOf', () => {
    it('throws if the value is not included in the list of expected values', () => {
      expect(
        () => validate.oneOf('foo', ['bar', 'baz']),
        'to throw',
        new ValidateError({
          validate,
          message: "expected a value in [ 'bar', 'baz' ]"
        })
      );
    });

    it('compares strings case-sensitively', () => {
      expect(
        () => validate.oneOf('foo', ['Foo', 'baz']),
        'to throw',
        new ValidateError({
          validate,
          message: "expected a value in [ 'Foo', 'baz' ]"
        })
      );
    });

    it('compares values with strict equality', () => {
      expect(
        () => validate.oneOf(1, ['1', 2]),
        'to throw',
        new ValidateError({
          validate,
          message: "expected a value in [ '1', 2 ]"
        })
      );
    });

    it('does not throw if the value is included in the list of expected values', () => {
      expect(() => validate.oneOf(1, [1, 2]), 'not to throw');
    });
  });

  describe('Validate.prototype.matching', () => {
    it('throws if the value does not match the regex', () => {
      expect(
        () => validate.matching('foo', /bar/),
        'to throw',
        new ValidateError({
          validate,
          message: 'expected a value matching /bar/'
        })
      );
    });

    it('does not throw if the value matches the regex', () => {
      expect(() => validate.matching('a', /[a-c]/), 'not to throw');
    });
  });

  describe('Validate.prototype.item', () => {
    it('rejects if any item in the array fails validation', async () => {
      await expect(
        validate.item(['foo', 'bar'], { matching: /foo/ }),
        'to be rejected with error satisfying',
        new ValidateError({
          validate,
          message: 'expected a value matching /foo/'
        })
      );
    });

    it('includes the index of the item in the error message', async () => {
      await expect(validate.path, 'to be', 'User.fields.id');
      await expect(
        validate.item([{ foo: ['foo', 'bar'] }], {
          shape: { foo: { item: { equalTo: 'foo' } } }
        }),
        'to be rejected with error satisfying',
        "User.fields.id[0].foo[1]: expected a value equal to 'foo'"
      );
      await expect(validate.path, 'to be', 'User.fields.id');
    });

    it('fulfils if all items pass validation', async () => {
      await expect(
        validate.item(['a', 'b', 'c'], { matching: /[a-c]/ }),
        'to be fulfilled'
      );
      await expect(validate.path, 'to be', 'User.fields.id');
    });
  });

  describe('Validate.prototype.shape', () => {
    it('rejects if an object property specified in the shape fails validation', async () => {
      await expect(
        validate.shape({ id: 1, name: 1 }, { id: 'integer', name: 'string' }),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'expected a string value' })
      );
    });

    it('includes the path to the property in the error message', async () => {
      await expect(validate.path, 'to be', 'User.fields.id');
      await expect(
        validate.shape(
          { foo: { bar: 'foo' } },
          { foo: { shape: { bar: 'boolean' } } }
        ),
        'to be rejected with error satisfying',
        'User.fields.id.foo.bar: expected a boolean value'
      );
      await expect(validate.path, 'to be', 'User.fields.id');
    });

    it('fulfils if the object satisfies the provided shape', async () => {
      await expect(validate.shape('d', /[a-c]/), 'to be fulfilled');
      await expect(validate.path, 'to be', 'User.fields.id');
    });

    it('ignores properties in the object not specified in the shape', async () => {
      await expect(validate.shape('d', /[a-c]/), 'to be fulfilled');
    });

    it('ignores properties in the shape not included in the object', async () => {
      await expect(
        validate.shape({ foo: 'foo' }, { foo: 'string', bar: 'string' }),
        'to be fulfilled'
      );
    });

    it('rejects if properties marked required in the shape are included in the object', async () => {
      await expect(
        validate.shape({ foo: 'foo' }, { foo: 'string', bar: 'required' }),
        'to be rejected with error satisfying',
        'User.fields.id.bar: missing required value'
      );
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
        new ValidateError({ validate, message: 'invalid value' })
      );
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
        new ValidateError({ validate, message: 'expected an integer value' })
      );
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
        new ValidateError({ validate, message: 'expected an integer value' })
      );
    });
  });

  describe('Validate.prototype.custom', () => {
    it('rejects if the function returns `false`', async () => {
      await expect(
        validate.custom('foo', () => false),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'invalid value' })
      );
    });

    it('rejects with the error thrown if the function throws', async () => {
      await expect(
        validate.custom('foo', () => {
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
      await expect(validate.custom('foo', () => {}), 'to be fulfilled');
    });

    it('rejects if the function resolves with `false`', async () => {
      await expect(
        validate.custom('foo', async () => false),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'invalid value' })
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

    it('supports returning a new `validate` object', async () => {
      await expect(
        validate.custom('foo', async () => ({ number: true })),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });

    it('supports returning a new `validate` string', async () => {
      await expect(
        validate.custom('foo', async () => 'number'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });
  });

  describe('Validate.prototype.validate', () => {
    it('validates the value against the spec', async () => {
      await expect(
        validate.validate('foo', { number: true }),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });

    it('converts a string into a validator object spec', async () => {
      await expect(
        validate.validate('foo', 'number'),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'expected a number value' })
      );
    });

    it('runs the `required` validator first', async () => {
      await expect(
        validate.validate(null, { number: true, required: true }),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'missing required value' })
      );
    });

    it('runs the `required` validator if the value is `undefined`', async () => {
      await expect(
        validate.validate(undefined, { required: true }),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'missing required value' })
      );
    });

    it('runs the `required` validator if the value is `null`', async () => {
      await expect(
        validate.validate(null, { required: true }),
        'to be rejected with error satisfying',
        new ValidateError({ validate, message: 'missing required value' })
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
        new ValidateError({ validate, message: 'expected a number value' })
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
  });
});
