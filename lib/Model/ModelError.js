const KnormError = require('../KnormError');

class ModelError extends KnormError {
  constructor({ message, Model }) {
    message = `${Model.name}: ${message}`;

    super(message);

    Object.defineProperties(this, { Model: { value: Model } });
  }
}

module.exports = ModelError;
