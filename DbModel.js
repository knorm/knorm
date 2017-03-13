const createError = require('../lib/createErrors');
const Model = require('./Model');

class DbModel extends Model {
    async fetch(options) {
        const where = await this.getData();
        const data = await this.constructor.query
            .options(options)
            .where(where)
            .require()
            .forge(false)
            .fetch();

        return this.setData(data);
    }

    async save(options) {
        return this.constructor.query
            .options(options)
            .save(this);
    }

    static get errors() {
        createErrors(this);
        return this._errors;
    }

    static set errors(errors) {
        createErrors(this);
        addErrors(this, errors);
    }

    static get query() {
        return new Query(this);
    }

    static set query(val) {
        throw new Error(`${this.constructor.name}.query cannot be overwriten`);
    }

    static async fetchById(id, options) {
        return this.query
            .options(options)
            .where({ id })
            .require()
            .first()
            .fetch();
    }
}

const createErrors = (model) => {
    if (!model._errors) {
        Object.defineProperty(model, '_errors', {
            value: getDefaultErrors(model),
            writable: true,
        });
        Object.defineProperty(model, '_errorsClassName', {
            value: model.name,
            writable: true,
        });
    }

    if (model._errorsClassName !== model.name) {
        model._errors = getDefaultErrors(model);
        model._errorsClassName = model.name;
    }
};

const addErrors = (model, errors) => {
    Object.assign(model._errors, errors);
};

const getDefaultErrors = (model) => {
    const DatabaseError = createError('DatabaseError', 'InternalServerError');
    return {
        SaveError: createError(
            `${model.name}SaveError`, DatabaseError
        ),
        CountError: createError(
            `${model.name}CountError`, DatabaseError
        ),
        FetchRowError: createError(
            `${model.name}FetchRowError`, DatabaseError
        ),
        FetchRowsError: createError(
            `${model.name}FetchRowsError`, DatabaseError
        ),
        RowNotInsertedError: createError(
            `${model.name}NotInsertedError`, DatabaseError
        ),
        RowNotUpdatedError: createError(
            `${model.name}NotUpdatedError`, DatabaseError
        ),
        RowNotFoundError: createError(
            `${model.name}NotFoundError`, 'NotFound'
        ),
        RowsNotFoundError: createError(
            `${model.name}sNotFoundError`, 'NotFound' // TODO: proper pluralizing
        ),
    };
};

module.exports = DbModel;

const Query = require('./Query'); // circular dep
