const createError = require('createerror');
const httpErrors = require('httperrors');

function createChildError(name, parent) {
    if (typeof parent === 'string' || typeof parent === 'number') {
        parent = httpErrors[parent];
        if (typeof parent !== 'function') {
            throw new Error(`Invalid parent error '${parent}' provided for '${name}'`);
        }
    }

    return createError({
        name: name
    }, parent);
}

module.exports = function (stringErrorOrObjectErrors, parentError) {
    if (typeof stringErrorOrObjectErrors === 'string') {
        return createChildError(String(stringErrorOrObjectErrors), parentError);
    }

    if (typeof stringErrorOrObjectErrors === 'object') {
        var errors = {};
        Object.keys(stringErrorOrObjectErrors).map(function (name) {
            errors[name] = createChildError(name, stringErrorOrObjectErrors[name]);
        });
        return errors;
    }
};
