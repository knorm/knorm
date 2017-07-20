const KnormError = require('./KnormError');

module.exports = class QueryError extends KnormError {
    constructor(messageOrError, query) {
        super(messageOrError);
        this.modelName = query.model.name;
        this.message = `${this.modelName}: ${this.message}`;
    }
};
