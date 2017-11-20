const { isUUID, isDecimal, isEmail } = require('validator');

class Field {
  constructor(config = {}) {
    const { name, model, type, validate, cast, references, column } = config;

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

    if (!typesArray.includes(type)) {
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

    this.name = name;
    this.type = type;
    this.path = path;
    this.model = model;
    this.column = column || this.getColumnName(name);

    if (references) {
      this.references = references;
      this._createReferences(references);
    }

    if (config.default !== undefined) {
      this.default = config.default;
    }

    const validators = { type };
    const {
      required,
      minLength,
      maxLength,
      oneOf,
      equals,
      regex,
      schema
    } = config;

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
    if (
      schema &&
      [types.json, types.jsonb, types.jsonObject, types.jsonArray].includes(
        type
      )
    ) {
      validators.schema = this._createValidators(schema);
    }

    this.validators = validators;
  }

  _createReferences(reference) {
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

    return this;
  }

  _createValidators(schema) {
    if (schema.type && typeof schema.type === 'string') {
      // is item schema
      return new Field(
        Object.assign({}, schema, {
          name: this.name,
          path: this.path,
          model: this.model
        })
      );
    }

    return Object.keys(schema).reduce((validators, key) => {
      let name;
      let path;
      const config = schema[key];

      if (typeof config === 'object') {
        name = key;
        path = `${this.path}.${name}`;
      } else {
        // if config is not an object, then it's invalid. the Field constructor
        // will therefore throw an error; with the next line, we just ensure it
        // throws the right error
        name = this.name;
      }

      validators[name] = new Field(
        Object.assign({}, config, {
          name,
          path,
          model: this.model
        })
      );
      return validators;
    }, {});
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
      column: this.column
    });
    clone.castors = this.castors;
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
    this._validateTypeWith(value, type, value => typeof value === 'number');
  }

  _validateIsString(value, type) {
    this._validateTypeWith(value, type, value => typeof value === 'string');
  }

  validateIsString(value, type) {
    this._validateIsString(value, type);
  }

  validateIsText(value, type) {
    this._validateIsString(value, type);
  }

  validateIsEmail(value, type) {
    this._validateIsString(value, 'string');
    this._validateTypeWith(value, type, value => isEmail(value));
  }

  validateIsBinary(value, type) {
    this._validateTypeWith(value, type, value => value instanceof Buffer);
  }

  validateIsInteger(value, type) {
    this._validateTypeWith(value, type, value => Number.isInteger(value));
  }

  validateIsBoolean(value, type) {
    this._validateTypeWith(value, type, value => typeof value === 'boolean');
  }

  _validateIsDate(value, type) {
    this._validateTypeWith(value, type, value => value instanceof Date);
  }

  validateIsDate(value, type) {
    this._validateIsDate(value, type);
  }

  validateIsDateTime(value, type) {
    this._validateIsDate(value, type);
  }

  validateIsUuid(value, type) {
    this._validateTypeWith(value, type, value => isUUID(value));
  }

  validateIsUuidV4(value, type) {
    this._validateTypeWith(value, type, value => isUUID(value, 4));
  }

  validateIsDecimal(value, type) {
    // validator.isDecimal requires the value to be a string
    this._validateTypeWith(value, type, value => isDecimal(String(value)));
  }

  validateIsJson(value, type) {
    this._validateIsAny(value, type);
  }

  validateIsJsonB(value, type) {
    this._validateIsAny(value, type);
  }

  validateIsJsonObject(value, type) {
    this._validateTypeWith(value, type, value => typeof value === 'object');
  }

  validateIsJsonArray(value, type) {
    this._validateTypeWith(value, type, value => Array.isArray(value));
  }

  validateTypeIs(value, type) {
    switch (type) {
      case types.any:
        return this.validateIsAny(value, type);

      case types.number:
        return this.validateIsNumber(value, type);

      case types.string:
        return this.validateIsString(value, type);

      case types.text:
        return this.validateIsText(value, type);

      case types.binary:
        return this.validateIsBinary(value, type);

      case types.email:
        return this.validateIsEmail(value, type);

      case types.integer:
        return this.validateIsInteger(value, type);

      case types.boolean:
        return this.validateIsBoolean(value, type);

      case types.date:
        return this.validateIsDate(value, type);

      case types.dateTime:
        return this.validateIsDateTime(value, type);

      case types.uuid:
        return this.validateIsUuid(value, type);

      case types.uuidV4:
        return this.validateIsUuidV4(value, type);

      case types.json:
        return this.validateIsJson(value, type);

      case types.jsonb:
        return this.validateIsJsonB(value, type);

      case types.jsonObject:
        return this.validateIsJsonObject(value, type);

      case types.jsonArray:
        return this.validateIsJsonArray(value, type);

      case types.decimal:
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

  validateEquals(value, equals) {
    if (!isSet(value)) {
      return true;
    }

    if (value !== equals) {
      this.throwValidationError(value, { equals });
    }
  }

  validateWithRegex(value, regex) {
    if (!isSet(value)) {
      return true;
    }

    if (!regex.test(value)) {
      this.throwValidationError(value, { regex });
    }
  }

  async validateWithCustom(value, validate, modelInstance) {
    if (value === undefined) {
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

  async validateWithSchema(value, schema, modelInstance) {
    if (schema instanceof Field) {
      if (this.type === types.jsonArray) {
        if (schema.validators.required && !value.length) {
          schema.valueIndex = undefined;
          schema.throwValidationError(value, { required: true });
        }
        return Promise.all(
          value.map(async (item, index) => {
            schema.valueIndex = index;
            return schema.validate(item, modelInstance);
          })
        );
      } else {
        return schema.validate(value, modelInstance);
      }
    }

    if (!isSet(value)) {
      return true;
    }

    return Promise.all(
      Object.values(schema).map(async field =>
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
      schema
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

    if (schema) {
      await this.validateWithSchema(value, schema, modelInstance);
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

  updateModel(model) {
    if (this.model && this.references) {
      const reference = this.references;
      const reverseReference = reference.model.referenced[this.model.name];
      reference.model.referenced[model.name] = reverseReference;
      // TODO: is it necessary to delete though
      delete reference.model.referenced[this.model.name];
    }

    if (this.validators.schema) {
      Object.values(this.validators.schema).forEach(field =>
        field.updateModel(model)
      );
    }

    this.model = model;

    return this;
  }
}

const isSet = value => value !== undefined && value !== null;

// TODO: add password field
// TODO: add all the types supported by knex
// TODO: allow adding types (figure out how to share validation logic with existing types)
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
  email: 'email',
  any: 'any',
  number: 'number',
  jsonObject: 'jsonObject',
  jsonArray: 'jsonArray'
};

const typesArray = Object.values(types);
Field.types = types;

Field.ValidationError = require('./ValidationError');

module.exports = Field;

const Model = require('./Model'); // circular dep
