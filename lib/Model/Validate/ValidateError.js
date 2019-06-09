const KnormError = require('../../KnormError');

class ValidateError extends KnormError {
  constructor({ message, validate }) {
    message = `${validate.path}: ${message}`;

    super(message);

    Object.defineProperties(this, {
      validate: { value: validate },
      field: { value: validate.field },
      model: { value: validate.model }
    });
  }
}

module.exports = ValidateError;
