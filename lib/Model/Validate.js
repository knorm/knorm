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
     * {@link Validate#shape} validators, this path also reflects the path to to
     * the array item or object entry.
     *
     * @type {string}
     */
    this.path = `${field.Model.name}.fields.${field.name}`;
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
   * a V3 {@link Validate#uuid3}.
   * @param {boolean} [spec.uuid4] Whether or not the value should be
   * a V4 {@link Validate#uuid4}.
   * @param {boolean} [spec.uuid5] Whether or not the value should be
   * a V5 {@link Validate#uuid5}.
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
   * @param {RegExp} [spec.matching] The regular expression that `value` should
   * match, via {@link Validate#matching}.
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
   * @returns {Promise} A `Promise` that is resolved if the param passes custom
   * validation, or otherwise rejected with a custom validation error or a
   * {@link ValidateError}.
   */
  async validate(value, spec) {
    if (typeof spec === 'string') {
      spec = { [spec]: true };
    }

    // TODO: document upgrade to node >= 8.6
    // TODO: remove all Object.assign calls
    const { required, custom, ...rest } = spec;

    // TODO: only run `required` and `custom` validators for Raw sql parts

    if (required) {
      this.required(value);
    }

    if (value !== undefined && value !== null) {
      await Promise.all(
        Object.entries(rest).map(async ([validator, spec]) => {
          if (typeof this[validator] === 'undefined') {
            return this.throwValidateError(
              `unknown validator ${inspect(validator)}`
            );
          }

          await this[validator](value, spec);
        })
      );
    }

    if (custom) {
      await this.custom(value, custom);
    }
  }

  /**
   * Validates that a value is required.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is `undefined` or `null`.
   */
  required(value) {
    if (value === undefined || value === null) {
      return this.throwValidateError('missing required value');
    }
  }

  /**
   * Validates that a value is a [finite
   * number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite),
   * including integers and floating point numbers.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a finite number.
   */
  number(value) {
    if (!Number.isFinite(value)) {
      return this.throwValidateError('expected a number value');
    }
  }

  /**
   * Validates that a value is [an
   * integer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger).
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not an integer.
   */
  integer(value) {
    if (!Number.isInteger(value)) {
      return this.throwValidateError('expected an integer value');
    }
  }

  /**
   * Validates that a value is string.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a string.
   */
  string(value) {
    if (typeof value !== 'string') {
      return this.throwValidateError('expected a string value');
    }
  }

  /**
   * Validates that a value is a boolean.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a boolean.
   */
  boolean(value) {
    if (typeof value !== 'boolean') {
      return this.throwValidateError('expected a boolean value');
    }
  }

  /**
   * Validates that a value is an email.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not an email.
   */
  email(value) {
    if (!isEmail(value)) {
      return this.throwValidateError('expected an email value');
    }
  }

  /**
   * Validates that a value is a UUID, disregarding what UUID version it is.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a UUID.
   */
  uuid(value) {
    if (!isUUID(value)) {
      return this.throwValidateError('expected a uuid value');
    }
  }

  /**
   * Validates that a value is a V3 UUID.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a V3 UUID.
   */
  uuid3(value) {
    if (!isUUID(value, 3)) {
      return this.throwValidateError('expected a v3 uuid value');
    }
  }

  /**
   * Validates that a value is a V4 UUID.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a V4 UUID.
   */
  uuid4(value) {
    if (!isUUID(value, 4)) {
      return this.throwValidateError('expected a v4 uuid value');
    }
  }

  /**
   * Validates that a value is a V5 UUID.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a V5 UUID.
   */
  uuid5(value) {
    if (!isUUID(value, 5)) {
      return this.throwValidateError('expected a v5 uuid value');
    }
  }

  /**
   * Validates that a value is a
   * [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date).
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a Date.
   */
  date(value) {
    if (!(value instanceof Date)) {
      return this.throwValidateError('expected a date value');
    }
  }

  /**
   * Validates that a value is an object.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not an object.
   */
  object(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return this.throwValidateError('expected an object value');
    }
  }

  /**
   * Validates that a value is a array.
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a array.
   */
  array(value) {
    if (!Array.isArray(value)) {
      return this.throwValidateError('expected an array value');
    }
  }

  /**
   * Validates that a value is a
   * [Buffer](https://nodejs.org/api/buffer.html#buffer_buffer).
   *
   * @param {*} value The value to validate.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not a Buffer.
   */
  buffer(value) {
    if (!(value instanceof Buffer)) {
      return this.throwValidateError('expected a buffer value');
    }
  }

  /**
   * Validates that a value is equal to another, using strict equality.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be equal to.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not equal to the given value.
   */
  equalTo(value, spec) {
    if (value !== spec) {
      return this.throwValidateError(
        `expected a value equal to ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that a value is greater than another.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be greater than.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not greater than the given value.
   */
  greaterThan(value, spec) {
    if (value <= spec) {
      return this.throwValidateError(
        `expected a value greater than ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that a value is greater than or equal to another.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be greater than or equal to.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not greater than or equal to the
   * given value.
   */
  greaterThanOrEqualTo(value, spec) {
    if (value < spec) {
      return this.throwValidateError(
        `expected a value greater than or equal to ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that a value is less than another.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be less than.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not less than the given value.
   */
  lessThan(value, spec) {
    if (value >= spec) {
      return this.throwValidateError(
        `expected a value less than ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that a value is less than or equal to another.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The value that `value` should be less than or equal to.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not less than or equal to the given
   * value.
   */
  lessThanOrEqualTo(value, spec) {
    if (value > spec) {
      return this.throwValidateError(
        `expected a value less than or equal to ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that a value's `length` is equal to a given length. This can be
   * used for any object with a length property such as strings and arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the `value`'s length should be equal to.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value's length is not equal to the given
   * length.
   */
  lengthEqualTo(value, spec) {
    if (value.length !== spec) {
      return this.throwValidateError(
        `expected a value whose length is equal to ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that a value's `length` is greater than a given length. This can
   * be used for any object with a length property such as strings and arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the `value`'s length should be greater
   * than.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value's length is not greater than the given
   * length.
   */
  lengthGreaterThan(value, spec) {
    if (value.length <= spec) {
      return this.throwValidateError(
        `expected a value whose length is greater than ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that a value's `length` is greater than or equal to a given
   * length. This can be used for any object with a length property such as
   * strings and arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the `value`'s length should be greater
   * than or equal to.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value's length is not greater than or equal
   * to the given length.
   */
  lengthGreaterThanOrEqualTo(value, spec) {
    if (value.length < spec) {
      return this.throwValidateError(
        `expected a value whose length is greater than or equal to ${inspect(
          spec
        )}`
      );
    }
  }

  /**
   * Validates that a value's `length` is less than a given length. This can
   * be used for any object with a length property such as strings and arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the `value`'s length should be less
   * than.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value's length is not less than the given
   * length.
   */
  lengthLessThan(value, spec) {
    if (value.length >= spec) {
      return this.throwValidateError(
        `expected a value whose length is less than ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that a value's `length` is less than or equal to a given length.
   * This can be used for any object with a length property such as strings and
   * arrays.
   *
   * @param {*} value The value to validate.
   * @param {*} spec The length that the `value`'s length should be less
   * than or equal to.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value's length is not less than or equal to
   * the given length.
   */
  lengthLessThanOrEqualTo(value, spec) {
    if (value.length > spec) {
      return this.throwValidateError(
        `expected a value whose length is less than or equal to ${inspect(
          spec
        )}`
      );
    }
  }

  /**
   * Validates that a value is one of the given values.
   *
   * @param {*} value The value to validate.
   * @param {array} spec The values to check against.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value is not included in the given values.
   */
  oneOf(value, spec) {
    if (!spec.includes(value)) {
      return this.throwValidateError(`expected a value in ${inspect(spec)}`);
    }
  }

  /**
   * Validates that a value matches the given [regular
   * expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).
   *
   * @param {*} value The value to validate.
   * @param {RegExp} spec The regular expression to test the value against.
   *
   * @returns {undefined} If the value is valid.
   *
   * @throws {ValidateError} If the value does not match the given regular
   * expression.
   */
  matching(value, spec) {
    if (!spec.test(value)) {
      return this.throwValidateError(
        `expected a value matching ${inspect(spec)}`
      );
    }
  }

  /**
   * Validates that all the items in an array satisfy the given spec.
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
    try {
      await Promise.all(
        value.map(async (item, index) => {
          this.path = `${path}[${index}]`;
          await this.validate(item, spec);
        })
      );
    } finally {
      this.path = path;
    }
  }

  /**
   * Validates that an object satisfies the given spec.
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
    try {
      await Promise.all(
        Object.entries(spec).map(async ([key, validate]) => {
          this.path = `${path}.${key}`;
          // TODO: JSON.parse string values before validation?
          await this.validate(value[key], validate);
        })
      );
    } finally {
      this.path = path;
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
    let passed = true;

    try {
      await this.validate(value, spec);
    } catch (e) {
      passed = false;
    }

    if (passed) {
      // TODO: better error message?
      return this.throwValidateError('invalid value');
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
    return Promise.all(asArray(specs).map(spec => this.validate(value, spec)));
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
   * @returns {Promise} A `Promise` that is resolved if the value passes custom
   * validation, or otherwise rejected with a custom validation error or a
   * {@link ValidateError}.
   */
  async custom(value, validator) {
    const result = await validator(value, this);

    if (result === false) {
      // TODO: better error message?
      return this.throwValidateError('invalid value');
    }

    if (typeof result === 'string' || typeof result === 'object') {
      return this.validate(value, result);
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
