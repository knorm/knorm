import { isUUID, isDecimal, isEmail } from 'validator';
import { Model } from './Model';
import { ValidationError } from './ValidationError';

const isSet = (value) => value !== undefined && value !== null;

/**
 * Creates and holds configuration for fields, e.g. how to validate or cast
 * fields.
 */
class Field {
  /**
   * Creates a {@link Field} instance.
   *
   * @param {object} [config] The field's configuration.
   */
  constructor(config = {}) {
    const {
      name,
      model,
      type,
      validate,
      cast,
      column,
      primary,
      updated = true,
      unique,
      methods,
    } = config;

    if (!name) {
      throw new Error('Field requires a name');
    }

    const path = config.path || name;

    if (!model || !(model.prototype instanceof Model)) {
      throw new Error(`Field \`${path}\` requires a subclass of \`Model\``);
    }

    const field = `\`${model.name}.${path}\``;

    if (!type) {
      throw new Error(`Field ${field} has no type configured`);
    }

    if (!this.constructor.types.includes(type)) {
      throw new Error(`Field ${field} has an invalid type \`${type}\``);
    }

    if (validate && typeof validate !== 'function') {
      throw new Error(
        `\`validate\` option for field ${field} should be a function`
      );
    }

    if (cast) {
      if (cast.forSave) {
        if (typeof cast.forSave !== 'function') {
          throw new Error(
            `\`cast.forSave\` option for field ${field} should be a function`
          );
        }
        this.castors = this.castors || {};
        this.castors.forSave = cast.forSave;
      }
      if (cast.forFetch) {
        if (typeof cast.forFetch !== 'function') {
          throw new Error(
            `\`cast.forFetch\` option for field ${field} should be a function`
          );
        }
        this.castors = this.castors || {};
        this.castors.forFetch = cast.forFetch;
      }
    }

    this.config = config;
    this.name = name;
    this.type = type;
    this.path = path;
    this.model = model;
    this.updated = updated;
    this.column = column || this.getColumnName(name);

    if (primary) {
      this.primary = true;
    }

    if (unique) {
      this.unique = true;
    }

    if (methods) {
      this.methods = true;
    }

    if (config.default !== undefined) {
      this.default = config.default;
    }

    this.validators = this._createValidators(config);
  }

  _createValidators(config) {
    const {
      type,
      validate,
      required,
      minLength,
      maxLength,
      oneOf,
      equals,
      regex,
      shape,
    } = config;

    const validators = { type };

    if (validate) {
      validators.validate = validate;
    }
    if (required) {
      validators.required = required;
    }
    if (minLength) {
      validators.minLength = minLength;
    }
    if (maxLength !== undefined) {
      validators.maxLength = maxLength;
    }
    if (oneOf) {
      validators.oneOf = oneOf;
    }
    if (equals !== undefined) {
      validators.equals = equals;
    }
    if (regex) {
      validators.regex = regex;
    }
    if (shape) {
      validators.shape = this._createShapeValidators(shape);
    }

    return validators;
  }

  // TODO: write regression tests for `new Field` vs `new this.constructor`
  _createShapeValidators(shape) {
    if (typeof shape === 'string') {
      shape = { type: shape };
    }

    if (shape.type && typeof shape.type === 'string') {
      // is item shape
      return new this.constructor(
        Object.assign({}, shape, {
          name: this.name,
          path: this.path,
          model: this.model,
        })
      );
    }

    return Object.keys(shape).reduce((validators, key) => {
      let name;
      let path;
      let config = shape[key];

      if (typeof config === 'string') {
        config = { type: config };
      }

      if (typeof config === 'object') {
        name = key;
        path = `${this.path}.${name}`;
      } else {
        // if config is not an object, then it's invalid. the Field constructor
        // will therefore throw an error; with the next line, we just ensure it
        // throws the right error
        name = this.name;
      }

      validators[name] = new this.constructor(
        Object.assign({}, config, {
          name,
          path,
          model: this.model,
        })
      );
      return validators;
    }, {});
  }

  getColumnName(fieldName) {
    return fieldName;
  }

  throwValidationError(value, validator) {
    throw new this.constructor.ValidationError({
      value,
      validator,
      field: this,
    });
  }

  validateIsRequired(value) {
    if (!isSet(value)) {
      this.throwValidationError(value, { required: true });
    }
  }

  _validateTypeWith(value, type, validate) {
    if (!isSet(value)) {
      return true;
    }
    if (!validate(value)) {
      this.throwValidationError(value, { type });
    }
  }

  _validateIsAny(value, type) {
    this._validateTypeWith(value, type, () => true);
  }

  validateIsAny(value, type) {
    this._validateIsAny(value, type);
  }

  validateIsNumber(value, type) {
    this._validateTypeWith(value, type, (value) => typeof value === 'number');
  }

  _validateIsString(value, type) {
    this._validateTypeWith(value, type, (value) => typeof value === 'string');
  }

  validateIsString(value, type) {
    this._validateIsString(value, type);
  }

  validateIsText(value, type) {
    this._validateIsString(value, type);
  }

  validateIsEmail(value, type) {
    this._validateIsString(value, 'string');
    this._validateTypeWith(value, type, (value) => isEmail(value));
  }

  validateIsBinary(value, type) {
    this._validateTypeWith(value, type, (value) => value instanceof Buffer);
  }

  validateIsInteger(value, type) {
    this._validateTypeWith(value, type, (value) => Number.isInteger(value));
  }

  validateIsBoolean(value, type) {
    this._validateTypeWith(value, type, (value) => typeof value === 'boolean');
  }

  _validateIsDate(value, type) {
    this._validateTypeWith(value, type, (value) => value instanceof Date);
  }

  validateIsDate(value, type) {
    this._validateIsDate(value, type);
  }

  validateIsDateTime(value, type) {
    this._validateIsDate(value, type);
  }

  validateIsUuid(value, type) {
    this._validateTypeWith(value, type, (value) => isUUID(value));
  }

  validateIsUuidV4(value, type) {
    this._validateTypeWith(value, type, (value) => isUUID(value, 4));
  }

  validateIsDecimal(value, type) {
    // validator.isDecimal requires the value to be a string
    this._validateTypeWith(value, type, (value) => isDecimal(String(value)));
  }

  validateIsJson(value, type) {
    this._validateIsAny(value, type);
  }

  validateIsJsonB(value, type) {
    this._validateIsAny(value, type);
  }

  validateIsObject(value, type) {
    this._validateTypeWith(value, type, (value) => typeof value === 'object');
  }

  validateIsArray(value, type) {
    this._validateTypeWith(value, type, (value) => Array.isArray(value));
  }

  validateTypeIs(value, type) {
    switch (type) {
      case 'any':
        return this.validateIsAny(value, type);

      case 'number':
        return this.validateIsNumber(value, type);

      case 'string':
        return this.validateIsString(value, type);

      case 'text':
        return this.validateIsText(value, type);

      case 'binary':
        return this.validateIsBinary(value, type);

      case 'email':
        return this.validateIsEmail(value, type);

      case 'integer':
        return this.validateIsInteger(value, type);

      case 'boolean':
        return this.validateIsBoolean(value, type);

      case 'date':
        return this.validateIsDate(value, type);

      case 'dateTime':
        return this.validateIsDateTime(value, type);

      case 'uuid':
        return this.validateIsUuid(value, type);

      case 'uuid4':
        return this.validateIsUuidV4(value, type);

      case 'json':
        return this.validateIsJson(value, type);

      case 'jsonb':
        return this.validateIsJsonB(value, type);

      case 'object':
        return this.validateIsObject(value, type);

      case 'array':
        return this.validateIsArray(value, type);

      case 'decimal':
        return this.validateIsDecimal(value, type);

      default:
        throw new Error(`no validator has been added for \`${type}\` types`);
    }
  }

  validateMinLengthIs(value, minLength) {
    if (!isSet(value)) {
      return true;
    }

    if (value.length < minLength) {
      this.throwValidationError(value, { minLength });
    }
  }

  validateMaxLengthIs(value, maxLength) {
    if (!isSet(value)) {
      return true;
    }

    if (value.length > maxLength) {
      this.throwValidationError(value, { maxLength });
    }
  }

  validateIsOneOf(value, oneOf) {
    if (!isSet(value)) {
      return true;
    }

    if (!oneOf.includes(value)) {
      this.throwValidationError(value, { oneOf });
    }
  }

  // TODO: support `equals` validator for json fields
  validateEquals(value, equals) {
    if (!isSet(value)) {
      return true;
    }

    if (value !== equals) {
      this.throwValidationError(value, { equals });
    }
  }

  _validateRegexMatching(value, regex) {
    if (!regex.test(value)) {
      this.throwValidationError(value, { regex, matching: true });
    }
  }

  _validateRegexNotMatching(value, regex) {
    if (regex.test(value)) {
      this.throwValidationError(value, { regex, notMatching: true });
    }
  }

  validateWithRegex(value, regex) {
    if (!isSet(value)) {
      return true;
    }

    if (regex instanceof RegExp) {
      return this._validateRegexMatching(value, regex);
    }

    const { matching, notMatching } = regex;

    if (matching) {
      this._validateRegexMatching(value, matching);
    }

    if (notMatching) {
      this._validateRegexNotMatching(value, notMatching);
    }
  }

  /**
   * Custom validator function, note that `async` validator functions, or
   * functions that return a {@link Promise}, are supported.
   *
   * Validation for the value will be failed if the function:
   *   - throws an error
   *   - returns `false`
   *   - returns a `Promise` that is rejected with an error
   *   - returns a `Promise` that is resolved with `false`
   *
   * This function may also return an object with the regular
   * [validators](/guides/fields.md#field-config), or resolving the `Promise`
   * with an object with validators, including another custom validator
   * function!
   *
   * @callback Field~customValidator
   * @param {any} value The value to validate.
   * @param {Model} model The {@link Model} instance where the field value is
   * set.
   *
   * @returns {Promise|boolean|object}
   */

  /**
   * Validates a value with a custom validator function.
   *
   * @param {any} value The value to validate
   * @param {Field~customValidator} validate The validator function.
   * @param {Model} model The {@link Model} instance where the field's value is
   * set.
   *
   * @returns {Promise} A `Promise` that is resolved if the `value` param passes
   * custom validation, or otherwise rejected.
   */
  async validateWithCustom(value, validate, model) {
    if (value === undefined) {
      return true;
    }

    const returnValue = await validate(value, model);

    if (returnValue === false) {
      this.throwValidationError(value, { validate });
    }

    if (typeof returnValue === 'object') {
      const validators = this._createValidators(returnValue);
      return this.validateWithValidators(value, validators, model);
    }
  }

  async validateWithShape(value, shape, modelInstance) {
    const isRootShape = shape instanceof Field;

    if (
      typeof value === 'string' &&
      !(isRootShape && shape.type === 'string')
    ) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        this.throwValidationError(value, { type: this.type });
      }
    }

    if (isRootShape) {
      if (this.type === 'array') {
        if (!value || !value.length) {
          if (shape.validators.required) {
            shape.valueIndex = undefined;
            shape.throwValidationError(value, { required: true });
          } else {
            return true;
          }
        }
        return Promise.all(
          value.map(async (item, index) => {
            shape.valueIndex = index;
            return shape.validate(item, modelInstance);
          })
        );
      } else {
        return shape.validate(value, modelInstance);
      }
    }

    if (!isSet(value)) {
      return true;
    }

    return Promise.all(
      Object.values(shape).map(async (field) =>
        field.validate(value[field.name], modelInstance)
      )
    );
  }

  async validateWithValidators(value, validators, modelInstance) {
    const {
      required,
      type,
      minLength,
      maxLength,
      oneOf,
      equals,
      regex,
      validate,
      shape,
    } = validators;

    if (required) {
      this.validateIsRequired(value);
    }

    if (!(value instanceof this.knorm.Query.prototype.sql)) {
      if (type) {
        this.validateTypeIs(value, type);
      }

      if (minLength) {
        this.validateMinLengthIs(value, minLength);
      }

      if (maxLength !== undefined) {
        this.validateMaxLengthIs(value, maxLength);
      }

      if (oneOf) {
        this.validateIsOneOf(value, oneOf);
      }

      if (equals !== undefined) {
        this.validateEquals(value, equals);
      }

      if (regex) {
        this.validateWithRegex(value, regex);
      }

      if (shape) {
        await this.validateWithShape(value, shape, modelInstance);
      }
    }

    if (validate) {
      await this.validateWithCustom(value, validate, modelInstance);
    }
  }

  async validate(value, modelInstance) {
    await this.validateWithValidators(value, this.validators, modelInstance);
  }

  /**
   * Casts a {@link Field}'s value with its configured cast functions.
   *
   * @param {any} value The value to be cast.
   * @param {Model} model The {@link Model} instance where the field's
   * value is set. The cast functions will be called with this instance as a
   * parameter.
   * @param {object} options Cast options.
   * @param {boolean} options.forSave Whether or not to cast for save operations
   * (i.e before insert or update). This function is called with the `value` as
   * the first paramter and `model` as the second parameter.
   * @param {boolean} options.forFetch Whether or not to cast for fetch
   * operations (i.e after fetch or any other operations that return data from
   * the database). This function is called with the `value` as the first
   * paramter and `model` as the second parameter.
   *
   * @returns {any} The cast value, or `undefined` if no cast functions are
   * configured for the {@link Field} instance.
   */
  cast(value, model, { forSave, forFetch }) {
    if (!this.castors) {
      return;
    }

    if (forSave) {
      if (!this.castors.forSave) {
        return;
      }
      return this.castors.forSave(value, model);
    }

    if (forFetch) {
      if (!this.castors.forFetch) {
        return;
      }
      return this.castors.forFetch(value, model);
    }
  }

  /**
   * Returns the default value for a field from the {@link Field}'s
   * configuration.
   *
   * @param {Model} model The {@link Model} instance where the field's default
   * value will be set. If the default is configured as a function, the function
   * is called with `model` as the first parameter.
   *
   * @returns {any|undefined} The default value or `undefined` if there's no
   * default value set for the field.
   */
  getDefault(model) {
    if (typeof this.default === 'function') {
      return this.default(model);
    }

    return this.default;
  }
}

Field.knorm = Field.prototype.knorm = null;

// TODO: add password type
// TODO: add all the types supported by knex
// TODO: document how to share validation logic with existing types
// TODO: document how to add new types
Field.types = [
  'text',
  'json',
  'jsonb',
  'uuid',
  'uuid4',
  'binary',
  'decimal',
  'string',
  'boolean',
  'integer',
  'dateTime',
  'date',
  // custom types:
  'email',
  'any',
  'number',
  'object',
  'array',
];

Field.ValidationError = ValidationError;

export { Field };
