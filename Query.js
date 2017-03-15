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
            throw new Error(`'${model.name}.table' is not configured`);
        }

        super();

        this.model = model;
        this.builder = this.constructor.knex(model.table);
        this.table = model.table;
        this.alias = model.table;
        this.index = 0;

        this._fields = [];
        this._returning = [];
        this._orderBy = [];
        this._with = [];
        this._where = [];
        this._whereNot = [];
        this._on = [];
    }

    _getField(name) {
        const field = this.model.fields[name];
        if (!field) {
            throw new Error(`Unknown field '${this.model.name}.${name}'`);
        }
        return field;
    }

    _getValidatedField(field) {
        if (isString(field)) {
            return this._getField(field);
        }

        if (!(field instanceof Field)) {
            throw new Error(`Invalid field object ${field}`);
        }

        if (field.model.name !== this.model.name) {
            throw new Error(`Field '${field.name}' is not a field of '${this.model.name}'`);
        }

        return field;
    }

    _getValidatedFields(fields) {
        if (isObject(fields)) {
            return Object.keys(fields).map(name => {
                const field = this._getValidatedField(name);
                const alias = isString(fields[name]) ? fields[name] : field.name;
                return { field, alias };
            });
        }

        if (!isArray(fields)) {
            fields = [ fields ];
        }

        if (isArray(fields)) {
            return fields.map(field => {
                field = this._getValidatedField(field);
                const alias = field.name;
                return { field, alias };
            });
        }
    }

    fields(fields) {
        this._fields.push(...this._getValidatedFields(fields));
        return this;
    }

    orderBy(order) {
        Object.keys(order).forEach(fieldName => {
            const field = this._getField(fieldName);
            let direction = order[fieldName];

            if (direction === 1) {
                direction = 'asc';
            } else if (direction === -1) {
                direction = 'desc';
            }

            this._orderBy.push({ field, direction });
        });

        return this;
    }

    with(queries, options) {
        if (!isArray(queries)) {
            queries = [ queries ];
        }

        queries.forEach(query => {
            if (query instanceof Model) {
                query = query.query;
            }

            if (
                !this.model.referenced[query.model.name] &&
                !query.model.referenced[this.model.name]
            ) {
                throw new Error(
                    `'${this.model.name}' has no references to '${query.model.name}'`
                );
            }

            query.index = ++this.index;
            query.alias = `t${query.index}`;
            query.builder = this.builder;

            if (options) {
                query.options(options);
            }

            this._with.push(query);
        });

        return this;
    }

    transaction(transaction, options) {
        let forUpdate;
        let forShare;

        if (transaction.transaction) {
            forUpdate = transaction.forUpdate;
            forShare = transaction.forShare;
            transaction = transaction.transaction;
        } else if (options) {
            forUpdate = options.forUpdate;
            forShare = options.forShare;
        }

        this._transaction = {
            transaction,
            forUpdate,
            forShare,
        };

        return this;
    }

    where(where) {
        Object.keys(where).forEach(fieldName => {
            const field = this._getField(fieldName);
            const value = where[fieldName];

            this._where.push({ field, value });
        });

        return this;
    }

    whereNot(whereNot) {
        Object.keys(whereNot).forEach(fieldName => {
            const field = this._getField(fieldName);
            const value = whereNot[fieldName];

            this._whereNot.push({ field, value });
        });

        return this;
    }

    returning(fields) {
        this._returning.push(...this._getValidatedFields(fields));
        return this;
    }

    options(options) {
        Object.keys(options).forEach(option => {
            if (typeof this[option] !== 'function') {
                throw new Error(`Unknown option '${option}'`);
            }

            this[option].call(this, options[option]);
        });

        return this;
    }

    require() {
        this._require = true;
        return this;
    }

    limit(limit) {
        this._limit = parseInt(limit);
        return this;
    }

    offset(offset) {
        this._offset = parseInt(offset);
        return this;
    }

    first() {
        this._first = true;
        return this;
    }

    forge(forge) {
        this._forge = forge;
        return this;
    }

    as(as) {
        this._as = as;
        return this;
    }

    on(fields) {
        this._on.push(...this._getValidatedFields(fields));

        return this;
    }

    _getColumn(field, alias) {
        let column = `${this.alias}.${field.column}`;

        if (alias) {
            column = `${column} as ${alias}`;
        }

        return column;
    }

    _getColumns(fields) {
        return fields.map(({ field, alias }) => {
            return this._getColumn(field, alias);
        });
    }

    _addTransaction() {
        this.builder.transacting(this._transaction.transaction);

        if (this._transaction.forUpdate) {
            this.builder.forUpdate();
        }

        if (this._transaction.forShare) {
            this.builder.forShare();
        }
    }

    _addFields() {
        this.builder.columns(this._getColumns(this._fields));
    }

    _addReturning() {
        this.builder.returning(this._getColumns(this._returning));
    }

    _addWhere() {
        this._where.forEach(({ field, value }) => {
            const column = this._getColumn(field);

            if (value === null) {
                this.builder.whereNull(column);
            } else if (Array.isArray(value)) {
                this.builder.whereIn(column, value);
            } else {
                this.builder.where(column, value);
            }
        });
    }

    _addWhereNot() {
        this._whereNot.forEach(({ field, value }) => {
            const column = this._getColumn(field);

            if (value === null) {
                this.builder.whereNotNull(column);
            } else if (Array.isArray(value)) {
                this.builder.whereNotIn(column, value);
            } else {
                this.builder.whereNot(column, value);
            }
        });
    }

    _addOrderBy() {
        this._orderBy.forEach(({ field, direction }) => {
            const column = this._getColumn(field);

            this.builder.orderBy(column, direction);
        });
    }

    _addLimit() {
        this.builder.limit(this._limit);
    }

    _addOffset() {
        this.builder.offset(this._offset);
    }

    _addWith(options) {
        this._with.forEach(query => {
            const method = query._require ? 'innerJoin' : 'leftJoin';
            const referenced = query.model.referenced[this.model.name];
            const isBackReference = !!referenced;

            let on;
            if (query._on.length) {
                on = query._on;
                if (isBackReference) {
                    on = on.map(field => referenced[this.model.name][field.name]);
                }
            } else {
                const references = this.model.referenced[query.model.name];
                on = Object.values(references);
            }

            on = on.reduce((on, field) => {
                const fromColumn = field.column;
                const toColumn = field.references.column;

                if (isBackReference) {
                    on[`${query.alias}.${toColumn}`] = `${this.alias}.${fromColumn}`;
                } else {
                    on[`${query.alias}.${fromColumn}`] = `${this.alias}.${toColumn}`;
                }

                return on;
            }, {});

            this.builder[method](`${query.table} as ${query.alias}`, on);

            if (!query._as) {
                query._as = camelCase(query.model.name);
            }

            query._prepareBuilder(options);
        });
    }

    _prepareBuilder(options = {}) {
        if (this._transaction) {
            this._addTransaction();
        }

        if (options.includeFields !== false) {
            if (!this._fields.length) {
                this._fields = Object.values(this.model.fields);
            }
            this._addFields();
        }

        if (this._returning.length) {
            this._addReturning();
        }

        if (this._where.length) {
            this._addWhere();
        }

        if (this._whereNot.length) {
            this._addWhereNot();
        }

        if (this._orderBy.length) {
            this._addOrderBy();
        }

        if (this._limit !== undefined) {
            this._addLimit();
        }

        if (this._offset !== undefined) {
            this._addOffset();
        }

        if (this._with.length) {
            this._addWith(options);
        }
    }

    _throw(name, error) {
        const TheError = this.model.errors[name];

        if (error) {
            throw new TheError(error.message);
        }

        throw new TheError();
    }

    async count({ field, distinct } = {}) {
        this._prepareBuilder({ includeFields: false });

        if (distinct) {
            this.builder.countDistinct(this._getColumn(this._getValidatedField(distinct)));
        } else if (field) {
            this.builder.count(this._getColumn(this._getValidatedField(field)));
        } else {
            this.builder.count();
        }

        let row;
        try {
            row = await this.builder.first();
        } catch (error) {
            this._throw('CountError', error);
        }

        return parseInt(row.count);
    }

    _forgeFromData(data) {
        // eslint-disable-next-line new-cap
        this._instance = new this.model(data[this.alias]);

        if (this._with.length) {
            this._with.forEach(query => {
                query._forgeFromData(data);
                this._instance[query._as] = query._instance;
            });
        }

        return this._instance;
    }

    _forgeFromRow(row) {
        const data = Object.keys(row).reduce((data, column) => {
            const value = row[column];
            const pair = column.split('.');
            const alias = pair[0];
            const field = pair[1];

            data[alias] = data[alias] || {};
            data[alias][field] = value;

            return data;
        }, {});

        return this._forgeFromData(data);
    }

    async fetch() {
        this._prepareBuilder();

        const method = this._first ? 'first' : 'select';

        let result;
        try {
            result = await this.builder[method]();
        } catch (error) {
            this._throw('FetchError', error);
        }

        if (!result || !result.length) {
            if (this._require) {
                const error = this._first ? 'RowNotFoundError' : 'RowsNotFoundError';
                this._throw(error);
            }
            return result;
        }

        if (!this._forge) {
            return result;
        }

        if (this._first) {
            return this._forgeFromRow(result);
        } else {
            return result.map(this._forgeFromRow, this);
        }
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
}

const isObject = value => typeof value === 'object' && value !== null;
const isString = value => typeof value === 'string';
const isArray = Array.isArray;

module.exports = Query;

const Model = require('./Model'); // circular dep
const Field = require('./Field');
