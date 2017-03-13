const { camelCase, snakeCase } = require('lodash');
const createError = require('./lib/createError');

class Field {
    constructor(config = {}) {
        const {
            name,
            model,
            default: defaultValue,
            type,
            references,
            required,
            validate,
            minLength,
            maxLength,
            oneOf,
        } = config;

        if (!name) {
            throw new Error('Field requires a name');
        }

        if (!model || !(model.prototype instanceof Model)) {
            throw new Error(`Field '${name}' requires a subclass of Model`);
        }

        if (!type) {
            throw new Error(
                `Field '${model.name}.${name}' has no type configured`
            );
        }

        if (!typesArray.includes(type)) {
            throw new Error(
                `Field '${model.name}.${name}' has an invalid type ('${type}')`
            );
        }

        if (validate && typeof validate !== 'function') {
            throw new Error(
                `Custom validator for field '${model.name}.${name}' should be a function`
            );
        }

        this.name = name;
        this.default = defaultValue;
        this.type = type;
        this.validators = {
            required,
            type,
            minLength,
            maxLength,
            oneOf,
            validate,
        };

        this.column = this.getColumnName();

        this.setModel(model);

        if (references) {
            this.setReference(references);
        }
    }

    getColumnName() {
        return snakeCase(this.name);
    }

    clone() {
        const clone = new this.constructor({
            name: this.name,
            type: this.type,
            model: this.model,
            default: this.default,
            references: this.references,
        });
        clone.validators = this.validators;
        return clone;
    }

    _validateIsRequired(value) {
        if (!isSet(value)) {
            throw new this.errors.Required();
        }
    }

    _validateTypeWith(value, validate) {
        if (!isSet(value)) {
            return true;
        }
        if (!validate(value)) {
            throw new this.errors.Type();
        }
    }

    _validateIsText(value) {
        this._validateTypeWith(value, value => typeof value === 'string');
    }

    _validateIsBinary(value) {
        this._validateTypeWith(value, value => value instanceof Buffer);
    }

    _validateIsString(value) {
        this._validateIsText(value);
        this._validateMaxLengthIs(value, 255);
    }

    _validateIsInteger(value) {
        this._validateTypeWith(value, value => Number.isInteger(value));
    }

    _validateIsBoolean(value) {
        this._validateTypeWith(value, value => typeof value === 'boolean');
    }

    _validateIsDateTime(value) {
        this._validateTypeWith(value, value => value instanceof Date);
    }

    _validateWithRegex(value, pattern) {
        this._validateTypeWith(value, value => pattern.test(value));
    }

    _validateIsUuid(value) {
        // source: https://github.com/chriso/validator.js/blob/6.2.1/src/lib/isUUID.js
        this._validateWithRegex(
            value,
            /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
        );
    }

    _validateIsUuidV4(value) {
        // source: https://github.com/chriso/validator.js/blob/6.2.1/src/lib/isUUID.js
        this._validateWithRegex(
            value,
            /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
        );
    }

    _validateIsDecimal(value) {
        // source: https://github.com/chriso/validator.js/blob/6.2.1/src/lib/isDecimal.js
        this._validateWithRegex(value, /^[-+]?([0-9]+|\.[0-9]+|[0-9]+\.[0-9]+)$/);
    }

    _validateIsJson(value) {
        this._validateIsText(value);
        this._validateTypeWith(value, value => {
            let object;

            try {
                // TODO: this is expensive!
                object = JSON.parse(value);
            } catch (e) {
                return false;
            }

            return !!object && typeof object === 'object';
        });
    }

    _validateTypeIs(value, type) {
        switch (type) {
        case types.text:
            return this._validateIsText(value);

        case types.binary:
            return this._validateIsBinary(value);

        case types.string:
            return this._validateIsString(value);

        case types.integer:
            return this._validateIsInteger(value);

        case types.boolean:
            return this._validateIsBoolean(value);

        case types.dateTime:
            return this._validateIsDateTime(value);

        case types.uuid:
            return this._validateIsUuid(value);

        case types.uuidV4:
            return this._validateIsUuidV4(value);

        case types.json:
            return this._validateIsJson(value);

        case types.decimal:
            return this._validateIsDecimal(value);

        default:
            throw new Error(`no validator has been added for '${type}' types`);
        }
    }

    _validateMinLengthIs(value, minLength) {
        if (!isSet(value)) {
            return true;
        }

        if (value.length < minLength) {
            throw new this.errors.MinLength();
        }
    }

    _validateMaxLengthIs(value, maxLength) {
        if (!isSet(value)) {
            return true;
        }

        if (value.length > maxLength) {
            throw new this.errors.MaxLength();
        }
    }

    _validateIsOneOf(value, oneOf) {
        if (!isSet(value)) {
            return true;
        }

        if (!oneOf.includes(value)) {
            throw new this.errors.OneOf();
        }
    }

    async _validateWithCustom(value, validate, modelInstance) {
        if (!isSet(value)) {
            return true;
        }

        const returnValue = await validate.call(modelInstance, value);

        if (returnValue === false) {
            throw new this.errors.Custom();
        }

        if (typeof returnValue === 'object') {
            return this._validateWith(value, returnValue, modelInstance);
        }
    }

    async _validateWith(value, validators, modelInstance) {
        const {
            required,
            type,
            minLength,
            maxLength,
            oneOf,
            validate,
        } = validators;

        if (required) {
            this._validateIsRequired(value);
        }

        if (type) {
            this._validateTypeIs(value, type);
        }

        if (minLength) {
            this._validateMinLengthIs(value, minLength);
        }

        if (maxLength) {
            this._validateMaxLengthIs(value, maxLength);
        }

        if (oneOf) {
            this._validateIsOneOf(value, oneOf);
        }

        if (validate) {
            await this._validateWithCustom(value, validate, modelInstance);
        }
    }

    async validate(value, modelInstance) {
        await this._validateWith(value, this.validators, modelInstance);
    }

    hasDefault() {
        return this.default !== undefined;
    }

    getDefault(modelInstance) {
        const defaultValue = this.default;

        if (typeof defaultValue === 'function') {
            return defaultValue.call(modelInstance);
        }

        return defaultValue;
    }

    setReference(reference) {
        if (!this.model.references[reference.model.name]) {
            this.model.references[reference.model.name] =  {};
        }
        this.model.references[reference.model.name][this.name] = reference;

        if (!reference.model.referenced[this.model.name]) {
            reference.model.referenced[this.model.name] =  {};
        }
        reference.model.referenced[this.model.name][reference.name] = this;

        this.references = reference;

        return this;
    }

    setModel(model) {
        if (this.model && this.references) {
            const reference = this.references;
            const backReference = reference.model.referenced[this.model.name];
            reference.model.referenced[model.name] = backReference;
            // TODO: delete though?
            delete reference.model.referenced[this.model.name];
        }

        this.model = model;

        const ModelField = upperCamelCase(this.model.name) + upperCamelCase(this.name);
        this.errors = {
            Required: createError(
                `MissingRequired${ModelField}Error`, 'BadRequest'
            ),
            Type: createError(
                `Invalid${ModelField}TypeError`, 'BadRequest'
            ),
            MinLength: createError(
                `${ModelField}TooShortError`, 'BadRequest'
            ),
            MaxLength: createError(
                `${ModelField}TooLongError`, 'BadRequest'
            ),
            OneOf: createError(
                `Unknown${ModelField}Error`, 'BadRequest'
            ),
            Custom: createError(
                `Invalid${ModelField}Error`, 'BadRequest'
            ),
        };

        return this;
    }
}

const upperCamelCase = string => {
    return camelCase(string).replace(/\b\w/g, match => {
        return match.toUpperCase();
    });
};

const isSet = value => value !== undefined && value !== null;

// TODO: add password field
const types = {
    text: 'text',
    json: 'json',
    uuid: 'uuid',
    binary: 'binary',
    uuidV4: 'uuidV4',
    decimal: 'decimal',
    string: 'string',
    boolean: 'boolean',
    integer: 'integer',
    dateTime: 'dateTime',
};

const typesArray = Object.values(types);

Field.types = types;

module.exports = Field;

const Model = require('./Model'); // circular dep
