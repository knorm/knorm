const KnormError = require('../KnormError');

class FieldError extends KnormError {
  constructor({ message, field }) {
    message = `${field.model.name}.fields.${field.name}: ${message}`;

    super(message);

    Object.defineProperties(this, { field: { value: field } });
  }
}

module.exports = FieldError;
