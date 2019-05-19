const KnormError = require('../KnormError');

class FieldError extends KnormError {
  constructor({ message, field }) {
    // TODO: field path?
    message = `${field.model.name}.fields.${field.name}: ${message}`;

    super(message);

    this.field = field;
  }
}

module.exports = FieldError;
