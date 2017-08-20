const KnormError = require('./KnormError');
const { inspect } = require('util');

class ValidationError extends KnormError {
  constructor({ field, value, validator = {}, path }) {
    super({ field, value, validator, path });
    this.field = field;
    this.value = value;
    this.validator = validator;

    let errorType;

    if (validator.required) {
      errorType = 'RequiredError';
    } else if (validator.type) {
      errorType = 'TypeError';
    } else if (validator.minLength) {
      errorType = 'MinLengthError';
    } else if (validator.maxLength) {
      errorType = 'MaxLengthError';
    } else if (validator.oneOf) {
      errorType = 'OneOfError';
    } else if (validator.equals) {
      errorType = 'EqualsError';
    } else if (validator.validate) {
      errorType = 'ValidatorError';
    }

    this.type = errorType;
  }

  formatMessage({ field, validator = {}, path }) {
    // TODO: fix this whole path thing.. too brittle atm
    path = path ? `${field.name}${path}` : field.name;
    const forFieldName = `for field \`${path}\` of \`${field.model.name}\``;
    const {
      required,
      type,
      minLength,
      maxLength,
      oneOf,
      equals,
      validate
    } = validator;
    let message;

    if (required) {
      message = `Missing required value ${forFieldName}`;
    } else if (type) {
      message = `Expected value of type \`${type}\` ${forFieldName}`;
    } else if (minLength) {
      message = `Expected value of min-length \`${minLength}\` ${forFieldName}`;
    } else if (maxLength) {
      message = `Expected value of max-length \`${maxLength}\` ${forFieldName}`;
    } else if (oneOf) {
      message = `Expected value ${forFieldName} to be one of ${inspect(oneOf)}`;
    } else if (equals) {
      message = `Expected value ${forFieldName} to equal ${inspect(equals)}`;
    } else if (validate) {
      message = `Validation failed ${forFieldName}`;
    }

    return message;
  }
}

module.exports = ValidationError;
