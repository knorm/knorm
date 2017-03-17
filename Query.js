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

        const idField = this.model.fields[this.model.idField];
        this._fields = [
            { field: idField, alias: idField.name },
        ];
        this._returning = [
            { field: idField, alias: idField.name },
        ];

        this._orderBy = [];
        this._groupBy = [];
        this._with = [];
        this._on = [];

        this._where = [];
        this._whereNot = [];
        this._orWhere = [];
        this._orWhereNot = [];

        this._having = [];
        this._havingNot = [];
        this._orHaving = [];
        this._orHavingNot = [];

        this._parsedRows = [];
        this._parsedData = {};
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

    _getValidatedFields(fields, options = {}) {
        if (!isArray(fields)) {
            fields = [ fields ];
        }

        const validatedFields = [];

        fields.forEach(field => {
            if (isString(field) || field instanceof Field) {
                field = this._getValidatedField(field);

                if (options.exclude && options.exclude === field.name) {
                    return;
                }

                if (!options.alias) {
                    return validatedFields.push({ field });
                }

                const alias = field.name;
                return validatedFields.push({ field, alias });
            }

            if (isObject(fields)) {
                return Object.keys(fields).map(name => {
                    const field = this._getValidatedField(name);

                    if (options.exclude && options.exclude === field.name) {
                        return;
                    }

                    if (!options.alias) {
                        return validatedFields.push({ field });
                    }

                    let alias = fields[name];
                    if (!isString(alias)) {
                        alias = field.name;
                    }

                    return validatedFields.push({ field, alias });
                });
            }
        });

        return validatedFields;
    }

    _pushValidatedFields(key, fields, options) {
        this[`_${key}`].push(...this._getValidatedFields(fields, options));
        return this;
    }

    fields(fields) {
        this._pushValidatedFields('fields', fields, {
            alias: true,
            exclude: this.model.idField,
        });
        this._hasFields = true;
        return this;
    }

    returning(fields) {
        this._pushValidatedFields('returning', fields, {
            alias: true,
            exclude: this.model.idField,
        });
        this._hasReturning = true;
        return this;
    }

    orderBy(orderBy) {
        Object.keys(orderBy).forEach(fieldName => {
            const field = this._getField(fieldName);
            let direction = orderBy[fieldName];

            if (direction === 1) {
                direction = 'asc';
            } else if (direction === -1) {
                direction = 'desc';
            }

            this._orderBy.push({ field, direction });
        });

        return this;
    }

    groupBy(fields) {
        return this._pushValidatedFields('groupBy', fields);
    }

    with(queries, options) {
        if (!isArray(queries)) {
            queries = [ queries ];
        }

        queries.forEach(query => {
            if (query.prototype instanceof Model) {
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
            query.isChild = true;
            query.parent = this;

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

    _pushWhereOrHaving(key, whereOrHaving) {
        Object.keys(whereOrHaving).forEach(fieldName => {
            const field = this._getField(fieldName);
            const value = whereOrHaving[fieldName];

            this[`_${key}`].push({ field, value });
        });

        return this;
    }

    where(where) { return this._pushWhereOrHaving('where', where); }
    whereNot(whereNot) { return this._pushWhereOrHaving('whereNot', whereNot); }
    orWhere(orWhere) { return this._pushWhereOrHaving('orWhere', orWhere); }
    orWhereNot(orWhereNot) { return this._pushWhereOrHaving('orWhereNot', orWhereNot); }

    having(having) { return this._pushWhereOrHaving('having', having); }
    havingNot(havingNot) { return this._pushWhereOrHaving('havingNot', havingNot); }
    orHaving(orHaving) { return this._pushWhereOrHaving('orHaving', orHaving); }
    orHavingNot(orHavingNot) { return this._pushWhereOrHaving('orHavingNot', orHavingNot); }

    options(options) {
        Object.keys(options).forEach(option => {
            if (typeof this[option] !== 'function') {
                throw new Error(`Unknown option '${option}'`);
            }
            if (
                option.startsWith('_') ||
                [ 'count', 'fetch', 'save' ].includes(option)
            ) {
                throw new Error(`'${option}' is not an allowed option`);
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
        return this._pushValidatedFields('on', fields);
    }

    _getColumn(field, alias) {
        const column = `${this.alias}.${field.column}`;

        if (alias) {
            return `${column} as ${this.alias}.${alias}`;
        } else {
            return column;
        }
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

    _addWhereOrHaving(key) {
        this[`_${key}`].forEach(({ field, value }) => {
            const column = this._getColumn(field);

            if (value === null) {
                this.builder[`${key}Null`](column);
            } else if (Array.isArray(value)) {
                this.builder[`${key}In`](column, value);
            } else if (typeof value === 'object') {
                this.builder[`${key}`](column, value.operator, value.value);
            } else if (key.toLowerCase().indexOf('having') > -1) {
                // FIXME: QueryBuilder expects `having` to have an operator, the
                // behaviour added in the next line is bound to change at some point
                this.builder[`${key}`](column, '=', value);
            } else {
                this.builder[`${key}`](column, value);
            }
        });
    }

    _addWhere() { this._addWhereOrHaving('where'); }
    _addWhereNot() { this._addWhereOrHaving('whereNot'); }
    _addOrWhere() { this._addWhereOrHaving('orWhere'); }
    _addOrWhereNot() { this._addWhereOrHaving('orWhereNot'); }

    _addHaving() { this._addWhereOrHaving('having'); }
    _addHavingNot() { this._addWhereOrHaving('havingNot'); }
    _addOrHaving() { this._addWhereOrHaving('orHaving'); }
    _addOrHavingNot() { this._addWhereOrHaving('orHavingNot'); }

    _addOrderBy() {
        this._orderBy.forEach(({ field, direction }) => {
            const column = this._getColumn(field);
            this.builder.orderBy(column, direction);
        });
    }

    _addGroupBy() {
        this.builder.groupBy(this._getColumns(this._groupBy));
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
                if (isBackReference) {
                    on = query._on.map(({ field }) => referenced[field.name]);
                } else {
                    on = query._on.map(({ field }) => field);
                }
            } else {
                const references = this.model.referenced[query.model.name];
                on = Object.values(references || referenced);
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

    _getFieldsWithAliases() {
        return Object.values(this.model.fields).map(field => ({
            field,
            alias: field.name,
        }));
    }

    _prepareBuilder(options = {}) {
        if (options.forSave) {
            if (!this._hasReturning) {
                this._returning = this._getFieldsWithAliases();
            }
            return this._addReturning();
        }

        if (options.includeFields !== false) {
            if (!this._hasFields) {
                this._fields = this._getFieldsWithAliases();
            }
            this._addFields();
        }

        if (this._with.length) { this._addWith(options); }

        if (this._where.length) { this._addWhere(); }
        if (this._whereNot.length) { this._addWhereNot(); }
        if (this._orWhere.length) { this._addOrWhere(); }
        if (this._orWhereNot.length) { this._addOrWhereNot(); }

        if (this._groupBy.length) { this._addGroupBy(); }

        if (this._having.length) { this._addHaving(); }
        if (this._havingNot.length) { this._addHavingNot(); }
        if (this._orHaving.length) { this._addOrHaving(); }
        if (this._orHavingNot.length) { this._addOrHavingNot(); }

        if (this._orderBy.length) { this._addOrderBy(); }

        if (this.isChild) {
            return this;
        }

        if (this._transaction) { this._addTransaction(); }
        if (this._first) { this._limit = 1; }
        if (this._limit !== undefined) { this._addLimit(); }
        if (this._offset !== undefined) { this._addOffset(); }

        return this;
    }

    _throw(name, error) {
        const TheError = this.model.errors[name];
        throw new TheError(error);
    }

    async count({ field, distinct } = {}) {
        this._prepareBuilder({ includeFields: false });

        if (distinct) {
            this.builder.countDistinct(
                this._getColumn(this._getValidatedField(distinct))
            );
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

    _hasData(data) {
        return Object.values(data[this.alias]).some(value => value !== null);
    }

    _parseData(data) {
        const instanceData = data[this.alias];
        const id = instanceData[this.model.idField];

        let parsedData = this._parsedData[id];
        if (!parsedData) {
            // eslint-disable-next-line new-cap
            parsedData = this._forge === false ? instanceData : new this.model(
                instanceData
            );
            this._parsedData[id] = parsedData;
            this._parsedRows.push(parsedData);
        }

        if (this._with.length) {
            this._with.forEach(query => {
                if (query._hasData(data)) {
                    const nestedData = query._parseData(data);

                    if (parsedData[query._as]) {
                        parsedData[query._as] = [
                            parsedData[query._as],
                            nestedData,
                        ];
                    } else {
                        parsedData[query._as] = nestedData;
                    }
                }
            });
        }

        return parsedData;
    }

    _parseRows(rows) {
        rows.forEach(row => {
            const data = Object.keys(row).reduce((data, column) => {
                const value = row[column];
                const pair = column.split('.');
                const alias = pair[0];
                const field = pair[1];

                data[alias] = data[alias] || {};
                data[alias][field] = value;

                return data;
            }, {});

            this._parseData(data);
        });

        return this._parsedRows.slice();
    }

    async fetch() {
        if (this.isChild) {
            throw new Error(
                `Cannot fetch from a child query. (${(
                    this.model.name
                )}.query is ${(
                    this.parent.model.name
                )}.query's child)`
            );
        }

        this._prepareBuilder();

        let rows;
        try {
            rows = await this.builder.select();
        } catch (error) {
            this._throw('FetchError', error);
        }

        if (!rows.length && this._require) {
            this._throw(this._first ? 'RowNotFoundError' : 'RowsNotFoundError');
        }

        rows = this._parseRows(rows);

        return this._first ? rows[0] : rows;
    }

    async save(model, { transaction } = {}) {
        // TODO
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
