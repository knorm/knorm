const { isUUID, isEmail } = require('validator');
const { inspect } = require('util');

const asArray = value => (Array.isArray(value) ? value : [value]);

/**
 * Validates values.
 */
class Validate {
  /**
   * Creates a new {@link Validate} instance.
   *
   * @param {Model} model The {@link Model} instance.
   * @param {Field} field The {@link Field} instance.
   */
  constructor(model, field) {
    /**
     * The {@link Model} instance.
     *
     * @type {Model}
     */
    this.model = model;

    /**
     * The {@link Field} instance.
     *
     * @type {Field}
     */
    this.field = field;

    /**
     * The field's full path. For {@link Validate#item} and
     * {@link Validate#shape} validators, this path also reflects the path to
     * the array item or object entry.
     *
     * @type {string}
     */
    this.path = `${field.Model.name}.fields.${field.name}`;

    /**
     * This indicates whether or not a validator should be negated. Used by the
     * {@link Validate#not} validator.
     */
    this.negate = false;
  }

  /**
   * Validates a value agaisnt the given spec. This method uses the validator
   * methods in {@link Validate} to validate the value.
   *
   * ::: tip INFO
   * - The {@link Validate#required} validator is run first, while the
   *   {@link Validate#custom} validator is run last.
   * - If the value is `undefined`, `null` or an {@link SqlPart} instance, only
   *   the {@link Validate#required} and {@link Validate#custom} validators are
   *   run; all other validators are skipped.
   * :::
   *
   * @param {*} value The value to validate.
   * @param {object|string} spec The spec to validate the value against. Passing
   * the spec as a string is just a shorthand; for example, `'string'` is a
   * shorthand for `{ string: true }`.
   * @param {boolean} [spec.required] Whether or not the value should be
   * {@link Validate#required}.
   * @param {boolean} [spec.number] Whether or not the value should be
   * a {@link Validate#number}.
   * @param {boolean} [spec.integer] Whether or not the value should be
   * an {@link Validate#integer}.
   * @param {boolean} [spec.string] Whether or not the value should be
   * a {@link Validate#string}.
   * @param {boolean} [spec.email] Whether or not the value should be
   * an {@link Validate#email}.
   * @param {boolean} [spec.uuid] Whether or not the value should be
   * a {@link Validate#uuid}.
   * @param {boolean} [spec.uuid3] Whether or not the value should be
   * a v3 {@link Validate#uuid3}.
   * @param {boolean} [spec.uuid4] Whether or not the value should be
   * a v4 {@link Validate#uuid4}.
   * @param {boolean} [spec.uuid5] Whether or not the value should be
   * a v5 {@link Validate#uuid5}.
   * @param {boolean} [spec.date] Whether or not the value should be
   * a {@link Validate#date}.
   * @param {boolean} [spec.object] Whether or not the value should be
   * an {@link Validate#object}.
   * @param {boolean} [spec.array] Whether or not the value should be
   * an {@link Validate#array}.
   * @param {boolean} [spec.buffer] Whether or not the value should be
   * a {@link Validate#buffer}.
   * @param {*} [spec.equalTo] The value that `value` should be
   * {@link Validate#equalTo}.
   * @param {*} [spec.greaterThan] The value that `value` should be
   * {@link Validate#greaterThan}.
   * @param {*} [spec.greaterThanOrEqualTo] The value that `value` should be
   * {@link Validate#greaterThanOrEqualTo}.
   * @param {*} [spec.lessThan] The value that `value` should be
   * {@link Validate#lessThan}.
   * @param {*} [spec.lessThanOrEqualTo] The value that `value` should be
   * {@link Validate#lessThanOrEqualTo}
   * @param {integer} [spec.lengthEqualTo] The length that `value`'s length
   * should be equal to, via {@link Validate#lengthEqualTo}.
   * @param {integer} [spec.lengthGreaterThan] The length that `value`'s length
   * should be greater than, via {@link Validate#lengthGreaterThan}.
   * @param {integer} [spec.lengthGreaterThanOrEqualTo] The length that
   * `value`'s should be greater than or equal to length, via
   * {@link Validate#lengthGreaterThanOrEqualTo}.
   * @param {integer} [spec.lengthLessThan] The length that `value`'s length
   * should be less than, via {@link Validate#lengthLessThan}.
   * @param {integer} [spec.lengthLessThanOrEqualTo] The length that `value`'s
   * length should be less than or equal to, via
   * {@link Validate#lengthLessThanOrEqualTo}.
   * @param {array} [spec.oneOf] The values that `value` should be
   * {@link Validate#oneOf}.
   * @param {RegExp} [spec.match] The regular expression that `value` should
   * match, via {@link Validate#match}.
   * @param {string|object} [spec.item] The spec that every item in the array
   * should satisfy, via {@link Validate#item}.
   * @param {object} [spec.shape] The shape that the object should satisfy, via
   * {@link Validate#shape}.
   * @param {string|object} [spec.not] The spec that the value should **not**
   * satisfy, via {@link Validate#not}.
   * @param {string[]|object[]} [spec.or] The specs that the value must satisfy
   * at least one of, via {@link Validate#or}.
   * @param {string[]|object[]} [spec.and] The specs that the value must satisfy
   * all of, via {@link Validate#and}.
   * @param {Validate~customValidator} [spec.or] The custom validator function,
   * ran via {@link Validate#custom}.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value passes validation or rejected with a custom validation error or a
   * {@link ValidateError} if it doesn't.
   */
  async validate(value, spec) {
    if (typeof spec === 'string') {
      spec = { [spec]: true };
    }

    // TODO: reject with all validation errors instead of the first one

    // TODO: document upgrade to node >= 8.6
    // TODO: remove all Object.assign calls
    const { required, custom, ...rest } = spec;

    if (required) {
      await this.required(value);
    }

    // TODO: only run `required` and `custom` validators for Raw sql parts

    if (value !== undefined && value !== null) {
      for (const [validator, spec] of Object.entries(rest)) {
        if (typeof this[validator] === 'undefined') {
          this.throwValidateError(`unknown validator ${inspect(validator)}`);
        }

        await this[validator](value, spec);
      }
    }

    if (custom) {
      await this.custom(value, custom);
    }
  }

  /**
   * Validates that a value is required i.e. not `undefined` and not `null`.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is set and not `null` or rejected with a {@link ValidateError} if
   * not.
   */
  async required(value) {
    this.throwValidateErrorIf(
      value === undefined || value === null,
      'value should be set and not null',
      'value should be unset or null'
    );
  }

  /**
   * Validates that a value is a [finite
   * number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite),
   * including integers and floating point numbers.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a finite number or rejected with a {@link ValidateError} if not.
   */
  async number(value) {
    this.throwValidateErrorIf(
      !Number.isFinite(value),
      'value should be a number',
      'value should not be a number'
    );
  }

  /**
   * Validates that a value is [an
   * integer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger).
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is an integer or rejected with a {@link ValidateError} if not.
   */
  async integer(value) {
    this.throwValidateErrorIf(
      !Number.isInteger(value),
      'value should be an integer',
      'value should not be an integer'
    );
  }

  /**
   * Validates that a value is string.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a string or rejected with a {@link ValidateError} if not.
   */
  async string(value) {
    this.throwValidateErrorIf(
      typeof value !== 'string',
      'value should be a string',
      'value should not be a string'
    );
  }

  /**
   * Validates that a value is a boolean.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a boolean or rejected with a {@link ValidateError} if not.
   */
  async boolean(value) {
    this.throwValidateErrorIf(
      typeof value !== 'boolean',
      'value should be a boolean',
      'value should not be a boolean'
    );
  }

  /**
   * Validates that a value is a email address.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is an email or rejected with a {@link ValidateError} if not.
   */
  async email(value) {
    this.throwValidateErrorIf(
      !isEmail(value),
      'value should be an email',
      'value should not be an email'
    );
  }

  /**
   * Validates that a value is a UUID, disregarding what UUID version it is.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a UUID or rejected with a {@link ValidateError} if not.
   */
  async uuid(value) {
    this.throwValidateErrorIf(
      !isUUID(value),
      'value should be a UUID',
      'value should not be a UUID'
    );
  }

  /**
   * Validates that a value is a v3 UUID.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a v3 UUID or rejected with a {@link ValidateError} if not.
   */
  async uuid3(value) {
    this.throwValidateErrorIf(
      !isUUID(value, 3),
      'value should be a v3 UUID',
      'value should not be a v3 UUID'
    );
  }

  /**
   * Validates that a value is a v4 UUID.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a v4 UUID or rejected with a {@link ValidateError} if not.
   */
  async uuid4(value) {
    this.throwValidateErrorIf(
      !isUUID(value, 4),
      'value should be a v4 UUID',
      'value should not be a v4 UUID'
    );
  }

  /**
   * Validates that a value is a v5 UUID.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a v5 UUID or rejected with a {@link ValidateError} if not.
   */
  async uuid5(value) {
    this.throwValidateErrorIf(
      !isUUID(value, 5),
      'value should be a v5 UUID',
      'value should not be a v5 UUID'
    );
  }

  /**
   * Validates that a value is a
   * [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date).
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a Date or rejected with a {@link ValidateError} if not.
   */
  async date(value) {
    this.throwValidateErrorIf(
      !(value instanceof Date),
      'value should be a date',
      'value should not be a date'
    );
  }

  /**
   * Validates that a value is an object. Note that `null` values and arrays are
   * not considered as objects.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is an object or rejected with a {@link ValidateError} if not.
   */
  async object(value) {
    this.throwValidateErrorIf(
      typeof value !== 'object' || value === null || Array.isArray(value),
      'value should be an object',
      'value should not be an object'
    );
  }

  /**
   * Validates that a value is an array.
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is an array or rejected with a {@link ValidateError} if not.
   */
  async array(value) {
    this.throwValidateErrorIf(
      !Array.isArray(value),
      'value should be an array',
      'value should not be an array'
    );
  }

  /**
   * Validates that a value is a
   * [Buffer](https://nodejs.org/api/buffer.html#buffer_buffer).
   *
   * @param {*} value The value to validate.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is a Buffer or rejected with a {@link ValidateError} if not.
   */
  async buffer(value) {
    this.throwValidateErrorIf(
      !(value instanceof Buffer),
      'value should be a buffer',
      'value should not be a buffer'
    );
  }

  /**
   * Validates that a value is equal to the expected value, using strict
   * equality.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be equal to.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is equal to the expected value or rejected with a
   * {@link ValidateError} if not.
   */
  async equalTo(value, spec) {
    this.throwValidateErrorIf(
      value !== spec,
      `value should be equal to ${inspect(spec)}`,
      `value should not be equal to ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value is greater than the expected value.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be greater than.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is greater than the expected value or rejected with a
   * {@link ValidateError} if not.
   */
  async greaterThan(value, spec) {
    this.throwValidateErrorIf(
      value <= spec,
      `value should be greater than ${inspect(spec)}`,
      `value should not be greater than ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value is greater than or equal to the expected value.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be greater than or equal to.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is greater than or equal to the expected value or rejected with a
   * {@link ValidateError} if not.
   */
  async greaterThanOrEqualTo(value, spec) {
    this.throwValidateErrorIf(
      value < spec,
      `value should be greater than or equal to ${inspect(spec)}`,
      `value should not be greater than or equal to ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value is less than the expected value.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be less than.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is less than the expected value or rejected with a
   * {@link ValidateError} if not.
   */
  async lessThan(value, spec) {
    this.throwValidateErrorIf(
      value >= spec,
      `value should be less than ${inspect(spec)}`,
      `value should not be less than ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value is less than or equal to the expected value.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be less than or equal to.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is less than or equal to the expected value or rejected with a
   * {@link ValidateError} if not.
   */
  async lessThanOrEqualTo(value, spec) {
    this.throwValidateErrorIf(
      value > spec,
      `value should be less than or equal to ${inspect(spec)}`,
      `value should not be less than or equal to ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value's `length` is equal to the expected length. This can
   * be used for any object with a length property such as strings and arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the value's length should be equal to.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value's length is equal to the expected length or rejected with a
   * {@link ValidateError} if not.
   */
  async lengthEqualTo(value, spec) {
    this.throwValidateErrorIf(
      value.length !== spec,
      `value's length should be equal to ${inspect(spec)}`,
      `value's length should not be equal to ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value's `length` is greater than the expected length. This
   * can be used for any object with a length property such as strings and
   * arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the value's length should be greater
   * than.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value's length is greater than the expected length or rejected with a
   * {@link ValidateError} if not.
   */
  async lengthGreaterThan(value, spec) {
    this.throwValidateErrorIf(
      value.length <= spec,
      `value's length should be greater than ${inspect(spec)}`,
      `value's length should not be greater than ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value's `length` is greater than or equal to the expected
   * length. This can be used for any object with a length property such as
   * strings and arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the value's length should be greater
   * than or equal to.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value's length is greater than or equal to the expected length or rejected
   * with a {@link ValidateError} if not.
   */
  async lengthGreaterThanOrEqualTo(value, spec) {
    this.throwValidateErrorIf(
      value.length < spec,
      `value's length should be greater than or equal to ${inspect(spec)}`,
      `value's length should not be greater than or equal to ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value's `length` is less than the expected length. This
   * can be used for any object with a length property such as strings and
   * arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the value's length should be less
   * than.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value's length is less than the expected length or rejected with a
   * {@link ValidateError} if not.
   */
  async lengthLessThan(value, spec) {
    this.throwValidateErrorIf(
      value.length >= spec,
      `value's length should be less than ${inspect(spec)}`,
      `value's length should not be less than ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value's `length` is less than or equal to the expected
   * length. This can be used for any object with a length property such as
   * strings and arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the value's length should be less
   * than or equal to.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value's length is less than or equal to the expected length or rejected
   * with a {@link ValidateError} if not.
   */
  async lengthLessThanOrEqualTo(value, spec) {
    this.throwValidateErrorIf(
      value.length > spec,
      `value's length should be less than or equal to ${inspect(spec)}`,
      `value's length should not be less than or equal to ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value is included in the list of expected values.
   *
   * @param {*} value The value to validate.
   * @param {array} spec The values to check against.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value is included in the expected values or rejected with a
   * {@link ValidateError} if not.
   */
  async oneOf(value, spec) {
    this.throwValidateErrorIf(
      !spec.includes(value),
      `value should be one of ${inspect(spec)}`,
      `value should not be one of ${inspect(spec)}`
    );
  }

  /**
   * Validates that a value matches the given [regular
   * expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).
   *
   * @param {*} value The value to validate.
   * @param {RegExp} spec The regular expression to test the value against.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value natches the regular expression or rejected with a
   * {@link ValidateError} if not.
   */
  async match(value, spec) {
    this.throwValidateErrorIf(
      !spec.test(value),
      `value should match ${inspect(spec)}`,
      `value should not match ${inspect(spec)}`
    );
  }

  /**
   * Validates that all the items in an array satisfy the given validation spec.
   *
   * @param {array} value The array with the items to validate.
   * @param {object|string} spec The spec to validate items against, which can
   * be any of the validators that {@link Validate#validate} supports.
   *
   * @example This validates that every array item is a string of a length
   * greater than two:
   * ```js
   * validate.item(['foo', 'bar'], { string: true, lengthGreaterThan: 2 });
   * ```
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if all
   * the array items are valid or rejected with a {@link ValidateError} if any
   * of them is not.
   */
  async item(value, spec) {
    const { path } = this;

    // TODO: reject with all validation errors instead of the first one

    try {
      for (let index = 0; index < value.length; index++) {
        const item = value[index];
        this.path = `${path}[${index}]`;
        await this.validate(item, spec);
      }
    } finally {
      this.path = path;
    }
  }

  /**
   * Validates that an object satisfies the given validation spec.
   *
   * @param {object} value The object to validate.
   * @param {object} spec The spec to validate the object against. Each key in
   * the spec should match a key that is expected to be in the object to be
   * validated, while the values should specify the spec to validate those
   * entries against. The values can be any of the validators that
   * {@link Validate#validate} supports.
   *
   * @example This only validates the `foo` entry; since `bar` is not specified
   * in the spec, it is ignored:
   * ```js
   * validate.shape(
   *   { foo: 'foo', bar: 'bar' },
   *   { foo: { string: true, lengthEqualto: 3 } }
   * );
   * ```
   *
   * @example This validates that a `foo` entry is required:
   * ```js
   * validate.shape({ bar: 'bar' }, { foo: 'required' });
   * ```
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if all
   * the object entries are valid or rejected with a {@link ValidateError} if
   * any of them is not.
   */
  async shape(value, spec) {
    const { path } = this;

    // TODO: reject with all validation errors instead of the first one

    try {
      for (const [key, validate] of Object.entries(spec)) {
        this.path = `${path}.${key}`;
        // TODO: JSON.parse string values before validation?
        await this.validate(value[key], validate);
      }
    } finally {
      this.path = path;
    }
  }

  /**
   * Validates that a value satisfies **at least one** of the given specs.
   *
   * ::: tip INFO
   * This method stops validating as soon as the value passes validation against
   * a spec. If the value fails against any of the specs, it rejects with the
   * first validation error.
   * :::
   *
   * @param {*} value The value to validate.
   * @param {object[]|string[]} spec The specs to validate the value against.
   * Each spec can be any of the validators that {@link Validate#validate}
   * supports.
   *
   * @example This validates that a value is either a string or an integer:
   * ```js
   * validate.or(1, ['string', 'integer']);
   * ```
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value satisfies at least one of the specs or rejected with a
   * {@link ValidateError} if it doesn't satisfy any of them.
   */
  async or(value, specs) {
    let error;

    // TODO: reject with all the validation errors instead of the first one

    for (const spec of asArray(specs)) {
      try {
        await this.validate(value, spec);
        error = undefined;
        break;
      } catch (e) {
        if (!error) {
          error = e;
        }
      }
    }

    if (error) {
      throw error;
    }
  }

  /**
   * Validates that a value satisfies **all** of the given specs. This is handy
   * for combining multiple {@link Validate#not} and {@link Validate#or}
   * validators.
   *
   * @param {*} value The value to validate.
   * @param {object[]|string[]} spec The specs to validate the value against.
   * Each spec can be any of the validators that {@link Validate#validate}
   * supports.
   *
   * @example This validates that a value is neither a string nor an integer:
   * ```js
   * validate.and(false, [{ not: 'string' }, { not: 'integer' }]);
   * ```
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value satisfies at all of the specs or rejected with a
   * {@link ValidateError} if it doesn't satisfy any of them.
   */
  async and(value, specs) {
    // TODO: reject with all the validation errors instead of the first one

    for (const spec of asArray(specs)) {
      await this.validate(value, spec);
    }
  }

  /**
   * Validates that a value does **not** satisfy the given spec.
   *
   * @param {*} value The value to validate.
   * @param {object|string} spec The spec to ensure that the value does not
   * satisfy. This can be any of the validators that {@link Validate#validate}
   * supports.
   *
   * @example This validates that a value is not a string:
   * ```js
   * validate.not(1, 'string');
   * ```
   *
   * @example This validates that a value is not _not_ a string:
   * ```js
   * validate.not('foo', { not: 'string' });
   * ```
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value does not satisfy the spec or rejected with a {@link ValidateError}
   * if it does.
   */
  async not(value, spec) {
    try {
      this.negate = true;
      await this.validate(value, spec);
    } finally {
      this.negate = false;
    }
  }

  /**
   * A custom validator function.
   *
   * This function may also return an object with the regular
   * [validators](/guides/fields.md#field-config), or resolving the `Promise`
   * with an object with validators, including another custom validator
   * function!
   *
   * @callback Validate~customValidator
   * @param {*} value The value to validate.
   * @param {Validate} validate The {@link Validate} instance. Therefore, the
   * function can call any of the {@link Validate} methods.
   *
   * @returns {Promise|boolean|object|string|undefined} If the field is valid,
   * the function should return `undefined`; that is, it should not return
   * anything. `async` functions should resolve with `undefined`. If the value
   * is not valid, the function should either:
   *
   * - throw an error or return a `Promise` that is rejected with an error
   * - return `false` or a `Promise` that is resolved with `false`
   *
   * If an error is thrown or the `Promise` is rejected, then that error is
   * used as the validation error. If it returns or resolves with `false`, then
   * a {@link ValidateError} is used as the validation error.
   *
   * The function may also return a new validation spec to trigger a new round
   * of validation. In this case, {@link Validate#validate} is called again with
   * the same value being validated and the function's return value as the
   * `validate` parameter.
   */

  /**
   * Validates a value with a custom validator function.
   *
   * @param {*} value The value to validate.
   * @param {Validate~customValidator} validator The custom validator function.
   *
   * @returns {Promise} A `Promise` that is resolved with `undefined` if the
   * value passes custom validation or rejected with a custom validation error
   * or a {@link ValidateError} if it doesn't.
   */
  async custom(value, validator) {
    // TODO: reject with all the validation errors instead of the first one

    const result = await validator(value, this);

    if (typeof result === 'string' || typeof result === 'object') {
      return this.validate(value, result);
    }

    this.throwValidateErrorIf(
      result === false,
      'value should pass custom validation',
      'value should not pass custom validation'
    );
  }

  /**
   * Throws a {@link ValidateError} if `invalid` is `true` with the `message`
   * passed. If `invalid` is `false` _and_ validation is negated (i.e.
   * {@link Validate#negate} is `true`), it throws a {@link ValidateError} with
   * the `negatedMessage`.
   *
   * @param {bool} invalid Whether or not to throw a {@link ValidateError}.
   * @param {string} message The message to use for the {@link ValidateError}.
   * @param {bool} invalid The message to use for the {@link ValidateError} when
   * validation is negated.
   *
   * @throws {ValidateError} If `invalid` and not {@link Validate#negate} _or_
   * if not `invalid` and {@link Validate#negate}.
   */
  throwValidateErrorIf(invalid, message, negatedMessage) {
    if (invalid) {
      if (!this.negate) {
        this.throwValidateError(message);
      }
    } else {
      if (this.negate) {
        this.throwValidateError(negatedMessage);
      }
    }
  }

  /**
   * Throws a {@link ValidateError}.
   *
   * @param {string} message The error message.
   *
   * @throws {ValidateError}
   */
  throwValidateError(message) {
    throw new this.constructor.ValidateError({
      message,
      validate: this
    });
  }
}

module.exports = Validate;

Validate.ValidateError = require('./Validate/ValidateError');
