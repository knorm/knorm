const createError = require('../helpers/createErrors');
const knex = require('../services/knex')();
const Model = require('./Model');

class DbModel extends Model {
    async fetch(options = {}) {
        const where = await this.getData();

        options = Object.assign({}, options, {
            where,
            require: true
        });

        const data = await this.constructor.fetchRow(options);

        return this.setData(data);
    }

    async save(options) {
        return this.constructor.save(this, options);
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

    static async save(model, options) {
        return this.query.save(model, options);
    }

    static async count(options) {
        return this.query.count(options);
    }

    static async fetchRow(options) {
        return this.query.fetchRow(options);
    }

    static async fetchOne(options) {
        return this.query.fetchOne(options);
    }

    static async fetchRows(options) {
        return this.query.fetchRows(options);
    }

    static async fetchAll(options) {
        return this.query.fetchAll(options);
    }

    static async fetchById(id, options) {
        options = Object.assign({}, options, {
            require: true,
            where: { id }
        });
        return this.fetchOne(options);
    }

    static async fetchByUserId(userId, options) {
        options = Object.assign({}, options, {
            require: true,
            where: { userId }
        });
        return this.fetchOne(options);
    }

    static async transact(callback) {
        return knex.transaction(async transaction => {
            return Promise.resolve(callback(transaction))
                .then(transaction.commit)
                .catch(transaction.rollback);
        });
    }
}

const createErrors = (model) => {
    if (!model._errors) {
        Object.defineProperty(model, '_errors', {
            configurable: true,
            value: getDefaultErrors(model)
        });
        Object.defineProperty(model, '_errorsClassName', {
            writable: true,
            value: model.name
        });
    }

    if (model._errorsClassName !== model.name) {
        addErrors(model, getDefaultErrors(model));
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
        )
    };
};

module.exports = DbModel;

const Query = require('./Query');
