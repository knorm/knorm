/**
 * Creates and holds configuration for fields.
 */
class Field {
  /**
   * Creates a {@link Field} instance.
   *
   * @param {Model} Model The {@link Model} that the field is bound to.
   */
  constructor(Model) {
    this.Model = Model;
  }

  /**
   * Sets a {@link Field} instance's config.
   *
   * @param {object} config The field's config. See {@link Model.addField} for
   * more info.
   */
  setConfig(config) {
    this.config = config;

    return this;
  }

  getConfig() {
    return this.config;
  }

  // TODO: remove
  throwFieldError(message) {
    throw new this.constructor.FieldError({
      message,
      field: this
    });
  }
}

Field.knorm = Field.prototype.knorm = null;

module.exports = Field;

Field.FieldError = require('./Field/FieldError');
