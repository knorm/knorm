module.exports = class KnormError extends Error {
    constructor(messageOrError) {
        let message;
        let originalError;

        if (messageOrError instanceof Error) {
            message = messageOrError.message;
            originalError = messageOrError;
        } else if (typeof messageOrError === 'string') {
            message = messageOrError;
        }

        super(message);

        this.name = this.constructor.name;

        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }

        if (originalError) {
            this.originalError = originalError;
        }
    }
};
