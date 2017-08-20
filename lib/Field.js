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
    const { required, minLength, maxLength, oneOf, equals, schema } = config;

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
    if (schema) {
      validators.schema = schema;
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
      column: this.column,
      cast: this.castors
    });
    clone.validators = this.validators;
    return clone;
  }

  throwValidationError(value, validator, path) {
    throw new this.constructor.ValidationError({
      value,
      validator,
      path,
      field: this
    });
  }

  validateIsRequired(value, path) {
    if (!isSet(value)) {
      this.throwValidationError(value, { required: true }, path);
    }
  }

  validateTypeWith(value, validate, type, path) {
    if (!isSet(value)) {
      return true;
    }
    if (!validate(value)) {
      this.throwValidationError(value, { type }, path);
    }
  }

  validateIsString(value, type, path) {
    this.validateTypeWith(
      value,
      value => typeof value === 'string',
      type,
      path
    );
  }

  validateIsEmail(value, type, path) {
    this.validateIsString(value, type, path);
    this.validateTypeWith(value, value => isEmail(value), type, path);
  }

  validateIsBinary(value, type, path) {
    this.validateTypeWith(value, value => value instanceof Buffer, type, path);
  }

  validateIsArray(value, path) {
    this.validateTypeWith(value, value => Array.isArray(value), 'array', path);
  }

  validateIsInteger(value, type, path) {
    this.validateTypeWith(value, value => Number.isInteger(value), type, path);
  }

  validateIsBoolean(value, type, path) {
    this.validateTypeWith(
      value,
      value => typeof value === 'boolean',
      type,
      path
    );
  }

  validateIsDate(value, type, path) {
    this.validateTypeWith(value, value => value instanceof Date, type, path);
  }

  validateWithRegex(value, pattern, type, path) {
    // TODO: this is unused atm. add support for regex validators
    this.validateTypeWith(value, value => pattern.test(value), type, path);
  }

  validateIsUuid(value, type, path) {
    this.validateTypeWith(value, value => isUUID(value), type, path);
  }

  validateIsUuidV4(value, type, path) {
    this.validateTypeWith(value, value => isUUID(value, 4), type, path);
  }

  validateIsDecimal(value, type, path) {
    // validator.isDecimal requires the value to be a string
    this.validateTypeWith(value, value => isDecimal(String(value)), type, path);
  }

  validateIsJson(value, type, path) {
    // TODO: autocast json fields since `string` type is not enforced now
    if (Array.isArray(value)) {
      return value;
    }

    const valueType = typeof value;

    if (valueType === 'object') {
      return value;
    }

    if (valueType === 'string') {
      let parsedValue;
      const validate = value => {
        try {
          // TODO: JSON.parse is expensive
          parsedValue = JSON.parse(value);
        } catch (e) {
          return false;
        }
        return !!parsedValue;
      };

      this.validateTypeWith(value, validate, type, path);

      return parsedValue;
    }
  }

  validateTypeIs(value, type, path) {
    switch (type) {
      case types.text:
      case types.string:
        return this.validateIsString(value, type, path);

      case types.binary:
        return this.validateIsBinary(value, type, path);

      case types.email:
        return this.validateIsEmail(value, type, path);

      case types.integer:
        return this.validateIsInteger(value, type, path);

      case types.boolean:
        return this.validateIsBoolean(value, type, path);

      case types.date:
      case types.dateTime:
        return this.validateIsDate(value, type, path);

      case types.uuid:
        return this.validateIsUuid(value, type, path);

      case types.uuidV4:
        return this.validateIsUuidV4(value, type, path);

      case types.json:
      case types.jsonb:
        return this.validateIsJson(value, type, path);

      case types.decimal:
        return this.validateIsDecimal(value, type, path);

      default:
        throw new Error(`no validator has been added for '${type}' types`);
    }
  }

  validateMinLengthIs(value, minLength, path) {
    if (!isSet(value)) {
      return true;
    }

    if (value.length < minLength) {
      this.throwValidationError(value, { minLength }, path);
    }
  }

  validateMaxLengthIs(value, maxLength, path) {
    if (!isSet(value)) {
      return true;
    }

    if (value.length > maxLength) {
      this.throwValidationError(value, { maxLength }, path);
    }
  }

  validateIsOneOf(value, oneOf, path) {
    if (!isSet(value)) {
      return true;
    }

    if (!oneOf.includes(value)) {
      this.throwValidationError(value, { oneOf }, path);
    }
  }

  validateEquals(value, equals, path) {
    if (!isSet(value)) {
      return true;
    }

    if (value !== equals) {
      this.throwValidationError(value, { equals }, path);
    }
  }

  async validateJsonField(value, validators, path, modelInstance) {
    const validate = async (value, validators) =>
      this.validateWithValidators(value, validators, path, modelInstance);

    if (Array.isArray(validators)) {
      validators = validators[0];

      this.validateIsArray(value, path);

      if (validators && isSet(value)) {
        await Promise.all(value.map(async item => validate(item, validators)));
      }
    } else {
      await validate(value, validators);
    }
  }

  async validateWithSchema(value, schema, path = '', modelInstance) {
    const validate = async (value, schema, index) => {
      await Promise.all(
        Object.keys(schema).map(async key => {
          // TODO: the path is is not working correctly with indexes
          path = `${path}.${key}${index !== undefined ? `.${index}` : ''}`;
          return this.validateJsonField(
            value[key],
            schema[key],
            path,
            modelInstance
          );
        })
      );
    };

    if (Array.isArray(schema)) {
      schema = schema[0];

      this.validateIsArray(value, path);

      if (schema) {
        await Promise.all(
          value.map(async (item, index) => validate(item, schema, index))
        );
      }
    } else {
      await validate(value, schema);
    }
  }

  async validateWithCustom(value, validate, path, modelInstance) {
    if (!isSet(value)) {
      return true;
    }

    const returnValue = await validate.call(modelInstance, value);

    if (returnValue === false) {
      this.throwValidationError(value, { validate }, path);
    }

    if (typeof returnValue === 'object') {
      return this.validateWithValidators(
        value,
        returnValue,
        path,
        modelInstance
      );
    }
  }

  async validateWithValidators(value, validators, path, modelInstance) {
    const {
      required,
      type,
      minLength,
      maxLength,
      oneOf,
      equals,
      validate,
      schema
    } = validators;

    if (required) {
      this.validateIsRequired(value, path);
    }

    if (type) {
      // NOTE: only the validateIsJson validator returns a value for now
      // this  is to avoid having to JSON.parse twice
      const typeValidatedValue = this.validateTypeIs(value, type, path);
      const isJson = type === Field.types.json || type === Field.types.jsonb;
      if (isJson && schema) {
        await this.validateWithSchema(
          typeValidatedValue,
          schema,
          path,
          modelInstance
        );
      }
    }

    if (minLength) {
      this.validateMinLengthIs(value, minLength, path);
    }

    if (maxLength) {
      this.validateMaxLengthIs(value, maxLength, path);
    }

    if (oneOf) {
      this.validateIsOneOf(value, oneOf, path);
    }

    if (equals) {
      this.validateEquals(value, equals, path);
    }

    if (validate) {
      await this.validateWithCustom(value, validate, path, modelInstance);
    }
  }

  async validate(value, modelInstance) {
    await this.validateWithValidators(
      value,
      this.validators,
      undefined,
      modelInstance
    );
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
