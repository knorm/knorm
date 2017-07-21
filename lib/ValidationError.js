const KnormError = require('./KnormError');

module.exports = class ValidationError extends KnormError {
    constructor(messageOrError, field, value, validator) {
        super(messageOrError);
        this.field = field;
        this.value = value;
        this.validator = validator;
        this.message = `${this.field.model.name}.${this.field.name}: ${this.message}`;
    }
};
