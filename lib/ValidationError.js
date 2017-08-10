const KnormError = require('./KnormError');
const { inspect } = require('util');

class ValidationError extends KnormError {
  constructor({ field, value, validator = {} }) {
    super({ field, value, validator });
    this.field = field;
    this.value = value;
    this.validator = validator;

    let errorType;
    const { required, type, minLength, maxLength, oneOf, validate } = validator;

    if (required) {
      errorType = 'RequiredError';
    } else if (type) {
      errorType = 'TypeError';
    } else if (minLength) {
      errorType = 'MinLengthError';
    } else if (maxLength) {
      errorType = 'MaxLengthError';
    } else if (oneOf) {
      errorType = 'OneOfError';
    } else if (validate) {
      errorType = 'ValidatorError';
    }

    this.type = errorType;
  }

  formatMessage({ field, validator = {} }) {
    const { required, type, minLength, maxLength, oneOf, validate } = validator;
    const forFieldName = `for field \`${field.name}\` of \`${field.model
      .name}\``;
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
    } else if (validate) {
      message = `Validation failed ${forFieldName}`;
    }

    return message;
  }
}

module.exports = ValidationError;
