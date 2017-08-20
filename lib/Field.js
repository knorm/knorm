const { isUUID, isDecimal, isEmail } = require('validator');

class Field {
  constructor(config = {}) {
    const { name, model, type, validate, cast } = config;

    if (!name) {
      throw new Error('Field requires a name');
    }

    if (!model || !(model.prototype instanceof Model)) {
      throw new Error(`Field '${name}' requires a subclass of Model`);
    }

    if (!type) {
      throw new Error(`Field '${model.name}.${name}' has no type configured`);
    }

    if (!typesArray.includes(type)) {
      throw new Error(
        `Field '${model.name}.${name}' has an invalid type ('${type}')`
      );
    }

    if (validate && typeof validate !== 'function') {
      throw new Error(
        `Custom validator for field '${model.name}.${name}' should be a function`
      );
    }

    if (cast) {
      if (cast.forSave) {
        if (typeof cast.forSave !== 'function') {
          throw new Error(
            `Pre-save cast function for field '${model.name}.${name}' should be a function`
          );
        }
        this.castors = this.castors || {};
        this.castors.forSave = cast.forSave;
      }
      if (cast.forFetch) {
        if (typeof cast.forFetch !== 'function') {
          throw new Error(
            `Post-fetch cast function for field '${model.name}.${name}' should be a function`
          );
        }
        this.castors = this.castors || {};
        this.castors.forFetch = cast.forFetch;
      }
    }

    this.name = name;
    this.type = type;
    this.setModel(model);

    if (config.default !== undefined) {
      this.default = config.default;
    }

    const validators = { type };
    const { required, minLength, maxLength, oneOf, equals } = config;

    if (validate) {
      validators.validate = validate;
    }
    if (required) {
      validators.required = required;
    }
    if (minLength) {
      validators.minLength = minLength;
    }
    if (maxLength) {
      validators.maxLength = maxLength;
    }
    if (oneOf) {
      validators.oneOf = oneOf;
    }
    if (equals) {
      validators.equals = equals;
    }

    this.validators = validators;

    const { references } = config;
    if (references) {
      this.setReference(references);
    }

    let { column } = config;
    if (!column) {
      column = this.getColumnName(name);
    }
    this.column = column;
  }

  getColumnName(fieldName) {
    return fieldName;
  }

  clone() {
    const clone = new this.constructor({
      name: this.name,
      type: this.type,
      model: this.model,
      default: this.default,
      references: this.references,
      cast: this.castors,
      column: this.column
    });
    clone.validators = this.validators;
    return clone;
  }

  throwValidationError(value, validator) {
    throw new this.constructor.ValidationError({
      value,
      validator,
      field: this
    });
  }

  validateIsRequired(value) {
    if (!isSet(value)) {
      this.throwValidationError(value, { required: true });
    }
  }

  validateTypeWith(value, validate) {
    if (!isSet(value)) {
      return true;
    }
    if (!validate(value)) {
      this.throwValidationError(value, { type: this.type });
    }
  }

  validateIsString(value) {
    this.validateTypeWith(value, value => typeof value === 'string');
  }

  validateIsText(value) {
    this.validateIsString(value);
  }

  validateIsEmail(value) {
    this.validateIsString(value);
    this.validateTypeWith(value, value => isEmail(value));
  }

  validateIsBinary(value) {
    this.validateTypeWith(value, value => value instanceof Buffer);
  }

  validateIsInteger(value) {
    this.validateTypeWith(value, value => Number.isInteger(value));
  }

  validateIsBoolean(value) {
    this.validateTypeWith(value, value => typeof value === 'boolean');
  }

  validateIsDate(value) {
    this.validateTypeWith(value, value => value instanceof Date);
  }

  validateWithRegex(value, pattern) {
    this.validateTypeWith(value, value => pattern.test(value));
  }

  validateIsUuid(value) {
    this.validateTypeWith(value, value => isUUID(value));
  }

  validateIsUuidV4(value) {
    this.validateTypeWith(value, value => isUUID(value, 4));
  }

  validateIsDecimal(value) {
    // validator.isDecimal requires the value to be a string
    this.validateTypeWith(value, value => isDecimal(String(value)));
  }

  validateIsJson(value) {
    this.validateIsText(value);
    this.validateTypeWith(value, value => {
      let object;

      try {
        // TODO: JSON.parse is expensive
        object = JSON.parse(value);
      } catch (e) {
        return false;
      }

      return !!object;
    });
  }

  validateTypeIs(value, type) {
    switch (type) {
      case types.text:
        return this.validateIsText(value);

      case types.binary:
        return this.validateIsBinary(value);

      case types.string:
        return this.validateIsString(value);

      case types.email:
        return this.validateIsEmail(value);

      case types.integer:
        return this.validateIsInteger(value);

      case types.boolean:
        return this.validateIsBoolean(value);

      case types.date:
      case types.dateTime:
        return this.validateIsDate(value);

      case types.uuid:
        return this.validateIsUuid(value);

      case types.uuidV4:
        return this.validateIsUuidV4(value);

      case types.json:
      case types.jsonb:
        return this.validateIsJson(value);

      case types.decimal:
        return this.validateIsDecimal(value);

      default:
        throw new Error(`no validator has been added for '${type}' types`);
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

  validateEquals(value, equals) {
    if (!isSet(value)) {
      return true;
    }

    if (value !== equals) {
      this.throwValidationError(value, { equals });
    }
  }

  async validateWithCustom(value, validate, modelInstance) {
    if (!isSet(value)) {
      return true;
    }

    const returnValue = await validate.call(modelInstance, value);

    if (returnValue === false) {
      this.throwValidationError(value, { validate });
    }

    if (typeof returnValue === 'object') {
      return this.validateWithValidators(value, returnValue, modelInstance);
    }
  }

  async validateWithValidators(value, validators, modelInstance) {
    const {
      required,
      type,
      minLength,
      maxLength,
      oneOf,
      equals,
      validate
    } = validators;

    if (required) {
      this.validateIsRequired(value);
    }

    if (type) {
      this.validateTypeIs(value, type);
    }

    if (minLength) {
      this.validateMinLengthIs(value, minLength);
    }

    if (maxLength) {
      this.validateMaxLengthIs(value, maxLength);
    }

    if (oneOf) {
      this.validateIsOneOf(value, oneOf);
    }

    if (equals) {
      this.validateEquals(value, equals);
    }

    if (validate) {
      await this.validateWithCustom(value, validate, modelInstance);
    }
  }

  async validate(value, modelInstance) {
    await this.validateWithValidators(value, this.validators, modelInstance);
  }

  cast(value, modelInstance, { forSave, forFetch }) {
    if (!this.castors) {
      return;
    }

    if (forSave) {
      if (!this.castors.forSave) {
        return;
      }
      return this.castors.forSave.call(modelInstance, value);
    }

    if (forFetch) {
      if (!this.castors.forFetch) {
        return;
      }
      return this.castors.forFetch.call(modelInstance, value);
    }
  }

  hasDefault() {
    return this.default !== undefined;
  }

  getDefault(modelInstance) {
    const defaultValue = this.default;

    if (typeof defaultValue === 'function') {
      return defaultValue.call(modelInstance);
    }

    return defaultValue;
  }

  setReference(reference) {
    if (!this.model.references[reference.model.name]) {
      this.model.references[reference.model.name] = {};
    }
    this.model.references[reference.model.name][this.name] = reference;

    if (!reference.model.referenced[this.model.name]) {
      reference.model.referenced[this.model.name] = {};
    }
    if (!reference.model.referenced[this.model.name][reference.name]) {
      reference.model.referenced[this.model.name][reference.name] = [];
    }
    reference.model.referenced[this.model.name][reference.name].push(this);

    this.references = reference;

    return this;
  }

  setModel(model) {
    if (this.model && this.references) {
      const reference = this.references;
      const reverseReference = reference.model.referenced[this.model.name];
      reference.model.referenced[model.name] = reverseReference;
      // TODO: is it necessary to delete though
      delete reference.model.referenced[this.model.name];
    }

    this.model = model;

    return this;
  }
}

const isSet = value => value !== undefined && value !== null;

// TODO: add password field
// TODO: add all the types supported by knex
// TODO: allow adding types (figure out how to share validation logic with existing types)
// TODO: knorm: support JSON schema for validation at least e.g. { schema: { values: [{ type: 'string' }] }
const types = {
  text: 'text',
  json: 'json',
  jsonb: 'jsonb',
  uuid: 'uuid',
  binary: 'binary',
  uuidV4: 'uuidV4',
  decimal: 'decimal',
  string: 'string',
  boolean: 'boolean',
  integer: 'integer',
  dateTime: 'dateTime',
  date: 'date',
  // custom types
  email: 'email'
};

const typesArray = Object.values(types);
Field.types = types;

const ValidationError = require('./ValidationError');
Field.ValidationError = ValidationError;

module.exports = Field;

const Model = require('./Model'); // circular dep
