module.exports = function createError(name, ParentError) {
    if (!ParentError) {
        ParentError = Error;
    }

    return class extends ParentError {
        constructor(message) {
            super(message);
            this.name = name;
        }

        static get name() {
            return name;
        }
    };
};
