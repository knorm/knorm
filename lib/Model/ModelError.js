const KnormError = require('../KnormError');

class ModelError extends KnormError {
  constructor({ message, Model }) {
    message = `${Model.name}: ${message}`;

    super(message);

    this.Model = Model;
  }
}

module.exports = ModelError;
