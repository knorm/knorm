class Model {
    constructor(data = {}) {
        Object.values(this.constructor.virtuals).forEach(virtual => {
            const name = virtual.name;

            if (this[name] !== undefined) {
                throw new Error(
                    `Cannot add Getter/Setter for virtual '${this.constructor.name}.${name}' ` +
                    `(${this.constructor.name}.prototype.${name} is already assigned)`
                );
            }

            let { get, set } = virtual;
            if (get) { get = get.bind(this); }
            if (set) { set = set.bind(this); }

            Object.defineProperty(this, name, {
                get,
                set,
                enumerable: true,
            });
        });

        this.setData(data);
    }

    _getField(name) {
        const field = this.constructor.fields[name];
        if (!field) {
            throw new Error(`Unknown field '${this.constructor.name}.${name}'`);
        }
        return field;
    }

    _getFields(fields) {
        if (!fields || !fields.length) {
            return Object.values(this.constructor.fields);
        }
        return fields.map(field => {
            if (typeof field === 'string') {
                field = this._getField(field);
            }
            return field;
        });
    }

    setDefaults({ fields } = {}) {
        this._getFields(fields).forEach(field => {
            const name = field.name;

            if (this[name] === undefined) {
                if (field.hasDefault()) {
                    this[name] = field.getDefault(this);
                }
            }
        });

        return this;
    }

    setData(data) {
        Object.keys(data).forEach(name => {
            const value = data[name];
            const field = this.constructor.fields[name];

            if (field) {
                this[name] = value;
            } else {
                const virtual = this.constructor.virtuals[name];
                if (!virtual) {
                    throw new Error(`Unknown field or virtual '${this.constructor.name}.${name}'`);
                }
                if (!virtual.hasSetter()) {
                    throw new Error(
                        `Virtual '${this.constructor.name}.${name}' has no setter`
                    );
                }
                this[name] = value;
            }
        });

        return this;
    }

    async getData({ fields, virtuals } = {}) {
        const data = this._getFields(fields).reduce((data, field) => {
            const name = field.name;
            const value = this[name];

            if (value !== undefined) {
                data[name] = value;
            }

            return data;
        }, {});

        if (virtuals) {
            if (!Array.isArray(virtuals) || !virtuals.length) {
                virtuals = Object.values(this.constructor.virtuals)
                    .filter(virtual => virtual.hasGetter())
                    .map(virtual => virtual.name);
            }
            const virtualsData = await Promise.all(
                virtuals.map(async name => {
                    const virtual = this.constructor.virtuals[name];
                    if (!virtual.get) {
                        throw new Error(
                            `Virtual '${this.constructor.name}.${name}' has no getter`
                        );
                    }
                    return virtual.get.call(this);
                })
            );
            virtuals.forEach((name, index) => {
                data[name] = virtualsData[index];
            });
        }

        return data;
    }

    async validate({ fields } = {}) {
        await Promise.all(this._getFields(fields).map(field => {
            const name = field.name;
            const value = this[name];
            return field.validate(value, this);
        }));

        return this;
    }

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
        return this.constructor.save(this, options);
    }

    static async save(data, options) {
        return this.query
            .options(options)
            .save(data);
    }

    static async fetch(options) {
        return this.query
            .options(options)
            .fetch();
    }

    static async fetchById(id, options) {
        if (!this.fields.id) {
            throw new Error(`${this.name} has no id field configured`);
        }

        return this.query
            .options(options)
            .where({ id })
            .require()
            .first()
            .fetch();
    }

    static get references() {
        createReferences(this);
        return this._references;
    }

    static get referenced() {
        createReferenced(this);
        return this._referenced;
    }

    static get fields() {
        createFields(this);
        return this._fields;
    }

    static set fields(fields) {
        createFields(this);
        addFields(this, fields);
    }

    static get virtuals() {
        createVirtuals(this);
        return this._virtuals;
    }

    static set virtuals(virtuals) {
        createVirtuals(this);
        addVirtuals(this, virtuals);
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
        return new this.Query(this);
    }

    static set query(val) {
        throw new Error(`${this.name}.query cannot be overwriten`);
    }
}

const createReferences = model => {
    if (!model._references) {
        Object.defineProperty(model, '_references', { value: {} });
    }
};

const createReferenced = model => {
    if (!model._referenced) {
        Object.defineProperty(model, '_referenced', { value: {} });
    }
};

const createFields = model => {
    if (!model._fields) {
        Object.defineProperty(model, '_fields', {
            value: {},
            writable: true,
        });

        Object.defineProperty(model, '_fieldsClassName', {
            value: model.name,
            writable: true,
        });
    }

    if (model._fieldsClassName !== model.name) {
        model._fields = Object.values(model._fields).reduce((fields, field) => {
            fields[field.name] = field.clone().setModel(model);
            return fields;
        }, {});
        model._fieldsClassName = model.name;
    }
};

const addFields = (model, fields) => {
    Object.keys(fields).forEach(name => {
        const fieldConfig = Object.assign({ name, model }, fields[name]);
        const field = new model.Field(fieldConfig);

        model._fields[name] = field;
    });
};

const createVirtuals = model => {
    if (!model._virtuals) {
        Object.defineProperty(model, '_virtuals', { value: {} });
    }
};

const addVirtuals = (model, virtuals) => {
    Object.keys(virtuals).forEach(name  => {
        const descriptor = virtuals[name];

        model._virtuals[name] = new model.Virtual({
            name,
            model,
            descriptor,
        });
    });
};

const createErrors = (model) => {
    if (!model._errors) {
        Object.defineProperty(model, '_errors', {
            value: getDefaultErrors(model),
            configurable: true,
        });
        Object.defineProperty(model, '_errorsClassName', {
            value: model.name,
            writable: true,
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

const createError = require('./lib/createError');

const getDefaultErrors = (model) => {
    const DatabaseError = createError('DatabaseError');
    return {
        SaveError: createError(`${model.name}SaveError`, DatabaseError),
        CountError: createError(`${model.name}CountError`, DatabaseError),
        FetchError: createError(`${model.name}FetchError`, DatabaseError),
        RowNotInsertedError: createError(`${model.name}NotInsertedError`, DatabaseError), // TODO: not a db error
        RowNotUpdatedError: createError(`${model.name}NotUpdatedError`, DatabaseError), // TODO: not a db error
        RowNotFoundError: createError(`${model.name}NotFoundError`),
        RowsNotFoundError: createError(`${model.name}sNotFoundError`), // TODO: proper pluralizing
    };
};

Model.idField = 'id';

module.exports = Model;

// circular deps
Model.Field = require('./Field');
Model.Virtual = require('./Virtual');
Model.Query = require('./Query');
