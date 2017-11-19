const KnormError = require('./KnormError');
const { inspect } = require('util');

class ValidationError extends KnormError {
  constructor({ field, value, validator = {} }) {
    super({ field, value, validator });
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
    } else if (validator.maxLength !== undefined) {
      errorType = 'MaxLengthError';
    } else if (validator.oneOf) {
      errorType = 'OneOfError';
    } else if (validator.equals) {
      errorType = 'EqualsError';
    } else if (validator.regex) {
      errorType = 'RegexError';
    } else if (validator.validate) {
      errorType = 'ValidatorError';
    }

    this.type = errorType;
  }

  formatMessage({ field, validator = {} }) {
    let message;

    let forFieldName = `for field \`${field.model.name}.${field.path}\``;
    if (field.valueIndex !== undefined) {
      forFieldName += ` at index ${field.valueIndex}`;
    }

    if (validator.required) {
      message = `Missing required value ${forFieldName}`;
    } else if (validator.type) {
      message = `Expected value of type \`${validator.type}\` ${forFieldName}`;
    } else if (validator.minLength) {
      message = `Expected value of min-length \`${validator.minLength}\` ${forFieldName}`;
    } else if (validator.maxLength !== undefined) {
      message = `Expected value of max-length \`${validator.maxLength}\` ${forFieldName}`;
    } else if (validator.oneOf) {
      message = `Expected value ${forFieldName} to be one of ${inspect(
        validator.oneOf
      )}`;
    } else if (validator.equals) {
      message = `Expected value ${forFieldName} to equal ${inspect(
        validator.equals
      )}`;
    } else if (validator.regex) {
      message = `Expected value ${forFieldName} to match ${inspect(
        validator.regex
      )}`;
    } else if (validator.validate) {
      message = `Validation failed ${forFieldName}`;
    }

    return message;
  }
}

module.exports = ValidationError;
