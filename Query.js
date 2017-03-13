const { camelCase, difference } = require('lodash');
const WithKnex = require('./lib/WithKnex');

class Query extends WithKnex {
    constructor(model) {
        if (!model) {
            throw new Error('Query requires a Model class');
        }

        if (!(model.prototype instanceof Model)) {
            throw new Error('Query requires a subclass of Model');
        }

        if (!model.table) {
            throw new Error(`'${model.name}.table' is not set`);
        }

        super();

        this.model = model;
        this.builder = this.constructor.knex(model.table);
        this._fields = [];
        this._orderBy = [];
        this._with = [];
        this.joins = {
            model,
            alias: model.table,
        };
        this.aliases = 0;
    }

    _addColumns(columns) {
        this.builder.columns(columns);
        return this;
    }

    fields(fields) {
        this._addColumns(getAliasedColumns(this.model, fields));
        return this;
    }

    orderBy(order) {
        Object.keys(order).forEach(field => {
            const column = getColumn(this.model, field);
            let direction = order[field];

            if (direction === 1) {
                direction = 'asc';
            } else if (direction === -1) {
                direction = 'desc';
            }

            this.builder.orderBy(column, direction);
        });
        return this;
    }

    _createJoin(into, model, options = {}) {
        if (isString(model)) {
            model = getModel(model);
        }

        const name = model.name;
        const table = model.table;

        if (!table) {
            throw new Error(`model '${name}' has no table property`);
        }

        let method;
        if (options.require) {
            method = 'innerJoin';
        } else {
            method = 'leftJoin';
        }

        let on = options.on;
        if (options.on) {
            on = Array.isArray(options.on) ? options.on : [ options.on ];
        }

        const from = into.model;
        const fromAlias = into.alias;
        const alias = `t${++this.aliases}`;
        let isBackReference;

        if (from.referenced[name]) {
            if (on) {
                on = on.map(field => getField(model, field));
            } else {
                on = Object.values(from.referenced[name]);
            }
        } else if (model.referenced[from.name]) {
            isBackReference = true;
            if (on) {
                on = on.map(field => {
                    field = getField(model, field);
                    return model.referenced[from.name][field.name];
                });
            } else {
                on = Object.values(model.referenced[from.name]);
            }
        } else {
            throw new Error(
                `model '${from.name}' has no references to '${name}'`
            );
        }

        on = on.reduce((on, field) => {
            const column = field.column;
            const reference = field.references;
            const fromColumn = reference.column;

            if (isBackReference) {
                on[`${alias}.${fromColumn}`] = `${fromAlias}.${column}`;
            } else {
                on[`${alias}.${column}`] = `${fromAlias}.${fromColumn}`;
            }

            return on;
        }, {});

        const as = options.as || camelCase(model.name);
        const { fields, where, whereNot } = options;

        const join = {
            model,
            name,
            table,
            method,
            as,
            on,
            alias,
            fields,
            where,
            whereNot,
        };

        into.models = into.models || [];
        into.models.push(join);

        return join;
    }

    _createJoins(into, models) {
        if (!Array.isArray(models)) {
            models = [ models ];
        }

        models.forEach(model => {
            if (isObject(model)) {
                return Object.keys(model).forEach(name => {
                    let options = model[name];

                    if (isString(options)) {
                        options = { as: options };
                    }

                    if (isObject(options)) {
                        const join = this._createJoin(into, name, options);
                        const nestedJoin = options.with;

                        if (nestedJoin) {
                            this._createJoins(join, nestedJoin);
                        }
                    }
                });
            }

            this._createJoin(into, model);
        });
    }

    _addJoin(from, to, options = {}) {
        const toTable = `${to.table} as ${to.alias}`;

        this.builder[to.method](toTable, to.on);

        const aliases = { model: to.alias };

        let fields;
        if (to.fields !== undefined) {
            fields = to.fields;
        } else if (options._includeFields !== false) {
            fields = to.model.fields;
        }
        if (fields) {
            this._addColumns(getAliasedColumns(to.model, fields, aliases));
        }

        if (to.where) {
            Object.keys(to.where).forEach(field => {
                const column = getColumn(to.model, field, aliases);
                const value = to.where[field];
                this._where(column, value);
            });
        }

        if (to.whereNot) {
            Object.keys(to.whereNot).forEach(field => {
                const column = getColumn(to.model, field, aliases);
                const value = to.whereNot[field];
                this._whereNot(column, value);
            });
        }
    }

    _addJoins(from, options) {
        if (!from.models) {
            return;
        }

        from.models.forEach(join => {
            this._addJoin(from, join, options);
            this._addJoins(join, options);
        });
    }

    with(models, options) {
        this._createJoins(this.joins, models);
        this._addJoins(this.joins, options);
        return this;
    }

    transaction(transaction, { forUpdate, forShare } = {}) {
        this.builder.transacting(transaction);
        if (forUpdate) {
            this.builder.forUpdate();
        }
        if (forShare) {
            this.builder.forShare();
        }
        return this;
    }

    _where(column, value) {
        if (value === null) {
            this.builder.whereNull(column);
        } else if (Array.isArray(value)) {
            this.builder.whereIn(column, value);
        } else {
            this.builder.where(column, value);
        }
    }

    _whereNot(column, value) {
        if (value === null) {
            this.builder.whereNotNull(column);
        } else if (Array.isArray(value)) {
            this.builder.whereNotIn(column, value);
        } else {
            this.builder.whereNot(column, value);
        }
    }

    where(where) {
        Object.keys(where).forEach(field => {
            const column = getColumn(this.model, field);
            const value = where[field];
            this._where(column, value);
        });
        return this;
    }

    whereNot(whereNot) {
        Object.keys(whereNot).forEach(field => {
            const column = getColumn(this.model, field);
            const value = whereNot[field];
            this._whereNot(column, value);
        });
        return this;
    }

    returning(fields) {
        this.builder.returning(getAliasedColumns(this.model, fields));
        return this;
    }

    _throw(name, error) {
        const TheError = this.model.errors[name];

        if (error) {
            throw new TheError({
                message: error.message,
                data: { error },
            });
        }

        throw new TheError();
    }

    async save(model, { transaction } = {}) {
        const Model = this.model;

        if (!(model instanceof Model)) {
            model = new Model(model);
        }

        const id = model.id;
        const isUpdate = !!id;
        const isInsert = !isUpdate;

        if (isUpdate) {
            this.where({ id });
        }

        if (transaction) {
            this.transaction(transaction);
        }

        let fields = Object.keys(Model.fields);

        this.returning(fields);

        let fieldsToSave;

        if (isInsert) {
            model.setDefaults();
            fieldsToSave = difference(fields, [ 'id' ]);
        } else {
            model.updatedAt = undefined;
            model.setDefaults({ fields: [ 'updatedAt' ] });
            const filledFields = fields.filter(name => model[name] !== undefined);
            fieldsToSave = difference(filledFields, [ 'id', 'createdAt' ]);
        }

        await model.validate({ fields: fieldsToSave });

        const data = await model.getData({ fields: fieldsToSave });

        const row = Object.keys(data).reduce((row, field) => {
            field = Model.fields[field];
            row[field.column] = data[field.name];
            return row;
        }, {});

        let result;

        try {
            if (isInsert) {
                result = await this.builder.insert(row);
            } else {
                result = await this.builder.update(row);
            }
        } catch (error) {
            this._throw('SaveError', error);
        }

        if (!result || !result[0]) {
            if (isInsert) {
                this._throw('RowNotInsertedError');
            } else {
                this._throw('RowNotUpdatedError');
            }
        }

        model.setData(result[0]);

        return model;
    }

    _prepareQuery(options = {}) {
        if (options.where) {
            this.where(options.where);
        }

        if (options.whereNot) {
            this.whereNot(options.whereNot);
        }

        if (options.fields) {
            this.fields(options.fields);
        } else if (options._includeFields !== false) {
            this.fields(this.model.fields);
        }

        if (options.with) {
            this.with(options.with, options);
        }

        if (options.transaction) {
            this.transaction(options.transaction, options);
        }
    }

    async fetchRow(options) {
        this._prepareQuery(options);

        let row;
        try {
            row = await this.builder.first();
        } catch (error) {
            this._throw('FetchRowError', error);
        }

        if (!row && options.require) {
            this._throw('RowNotFoundError');
        }

        return row;
    }

    async fetchRows(options = {}) {
        this._prepareQuery(options);

        if (options.orderBy) {
            this.orderBy(options.orderBy);
        }

        if (options.limit) {
            this.builder.limit(parseInt(options.limit));
        }

        let rows;
        try {
            rows = await this.builder.select();
        } catch (error) {
            this._throw('FetchRowsError', error);
        }

        if (!rows.length && options.require) {
            this._throw('RowsNotFoundError');
        }

        return rows;
    }

    _forge(row) {
        if (!this.joins.models) {
            return new this.model(row); // eslint-disable-line new-cap
        }

        const data = Object.keys(row).reduce((data, field) => {
            const value = row[field];

            if (field.indexOf('.') < 0) {
                data.root[field] = value;
            } else {
                const pair = field.split('.');
                const alias = pair[0];
                const fieldAlias = pair[1];
                data.aliases[alias] = data.aliases[alias] || {};
                data.aliases[alias][fieldAlias] = value;
            }

            return data;
        }, { root: {}, aliases: {} });

        const forge = (from, into) => {
            if (!from.models) {
                return;
            }

            from.models.forEach(join => {
                const joinData = data.aliases[join.alias];
                if (!joinData) {
                    return;
                }

                const hasData = Object.values(joinData).some(value => {
                    return value !== null;
                });

                if (!hasData) {
                    return;
                }

                const NestedModel = join.model;
                const nestedInstance = new NestedModel(joinData);

                into[join.as] = nestedInstance;

                forge(join, nestedInstance);
            });
        };

        const instance = new this.model(data.root); // eslint-disable-line new-cap

        forge(this.joins, instance);

        return instance;
    }

    async fetchOne(options) {
        const row = await this.fetchRow(options);
        if (row) {
            return this._forge(row);
        }
    }

    async fetchAll(options) {
        const rows = await this.fetchRows(options);
        return rows.map(this._forge, this);
    }

    async count(options = {}) {
        options = Object.assign({
            _includeFields: false,
        }, options);

        this._prepareQuery(options);

        const { distinct, field } = options;
        if (distinct) {
            this.builder.countDistinct(getColumn(this.model, distinct));
        } else {
            let column;
            if (field) {
                column = getColumn(this.model, field);
            }
            this.builder.count(column);
        }

        let row;
        try {
            row = await this.builder.first();
        } catch (error) {
            this._throw('CountError', error);
        }

        return parseInt(row.count);
    }
}

const isObject = value => typeof value === 'object' && value !== null;
const isString = value => typeof value === 'string';

const getModel = name => {
    const model = Query.models[name];
    if (!model) {
        throw new Error(`unknown model '${name}'`);
    }
    return model;
};

const getField = (model, name) => {
    const field = model.fields[name];
    if (!field) {
        throw new Error(`unknown field '${model.name}.${name}'`);
    }
    return field;
};

const getColumn = (model, field, aliases = {}) => {
    if (isString(field)) {
        field = getField(model, field);
    }

    let column = field.column;
    let table = aliases.model || field.model.table;

    return `${table}.${column}`;
};

const getAliasedColumn = (model, field, aliases = {}) => {
    if (isString(field)) {
        field = getField(model, field);
    }

    const column = getColumn(model, field, aliases);
    let alias = aliases.field || field.name;

    if (aliases.model) {
        alias = `${aliases.model}.${alias}`;
    }

    return `${column} as ${alias}`;
};

const getAliasedColumns = (model, fields, aliases = {}) => {
    if (isString(fields) || fields instanceof Model.Field) {
        fields = [ fields ];
    }

    if (Array.isArray(fields)) {
        return fields.map(field => {
            return getAliasedColumn(model, field, aliases);
        });
    }

    if (isObject(fields)) {
        return Object.keys(fields).map(name => {
            const alias = fields[name];
            if (isString(alias)) {
                aliases.field = fields[name];
            }
            return getAliasedColumn(model, name, aliases);
        });
    }
};

module.exports = Query;

const Model = require('./Model'); // circular dep
