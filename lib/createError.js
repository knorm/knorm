module.exports = function createError(name, ParentError) {
    if (!ParentError) {
        ParentError = Error;
    }

    return class extends ParentError {
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

            this.name = name;

            if (originalError) {
                this.originalError = originalError;
            }
        }

        static get name() {
            return name;
        }
    };
};
