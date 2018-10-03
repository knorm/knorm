const { Knorm } = require('@knorm/knorm');
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const sqlBricksPostgres = require('sql-bricks-postgres');

const formatSql = sql => {
  if (typeof sql === 'string') {
    return sql;
  }
  if (sql instanceof sqlBricksPostgres.Statement) {
    return sql.toParams();
  }
  return sql;
};

class KnormPostgres {
  constructor({
    connection,
    initClient,
    restoreClient,
    name = 'postgres'
  } = {}) {
    this.name = name;
    this.pool = new Pool(
      typeof connection === 'string' ? parse(connection) : connection
    );

    if (initClient) {
      this._initClient = initClient;
    }

    if (restoreClient) {
      this._restoreClient = restoreClient;
    }
  }

  // TODO: throw custom errors
  async acquireClient() {
    const client = await this.pool.connect();

    if (this._initClient) {
      try {
        await this._initClient(client);
      } catch (e) {
        client.release();
        throw e;
      }
    }

    return client;
  }

  // TODO: throw custom errors
  async releaseClient(client) {
    if (this._restoreClient) {
      try {
        await this._restoreClient(client);
      } catch (e) {
        client.release();
        throw e;
      }
    }

    client.release();
  }

  updateField(knorm) {
    const { Field } = knorm;

    knorm.Field = knorm.Model.Field = class PostgresField extends Field {
      // TODO: v2: auto-cast decimal fields from string on fetch
      cast(value, modelInstance, options) {
        if (
          (this.type !== 'json' && this.type !== 'jsonb') ||
          value instanceof knorm.Query.prototype.sql
        ) {
          return super.cast(value, modelInstance, options);
        }

        if (value !== null) {
          if (options.forSave) {
            if (this.castors && this.castors.forSave) {
              return super.cast(value, modelInstance, options);
            }
            return JSON.stringify(value);
          }

          if (options.forFetch) {
            if (this.castors && this.castors.forFetch) {
              return super.cast(value, modelInstance, options);
            }
            // only values coming from the database will be strings
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch (e) {
                // root-level string JSON values are already "parsed"
                // TODO: should this error be propagated?
              }
            }
          }
        }
      }

      validateIsString(value, type) {
        super.validateIsString(value, type);
        this.validateMaxLengthIs(value, 255);
      }
    };
  }

  updateTransation(knorm) {
    const { Transaction } = knorm;
    const knormPostgres = this;

    class PostgresTransaction extends Transaction {
      async acquireClient() {
        this.client = await knormPostgres.acquireClient();
      }

      async releaseClient() {
        try {
          await knormPostgres.releaseClient(this.client);
        } finally {
          this.client = null;
        }
      }

      async _query(sql) {
        const client = this.client;
        const newSql = await this.beforeQuery(client, sql);

        sql = newSql || sql;

        const result = await client.query(formatSql(sql));
        const newResult = await this.afterQuery(client, sql, result);
        const { rows } = newResult || result;

        return rows;
      }

      async _begin() {
        try {
          await this._query('BEGIN');
        } catch (e) {
          throw new this.constructor.TransactionBeginError(e);
        }
      }

      async _commit() {
        try {
          await this._query('COMMIT');
        } catch (e) {
          throw new this.constructor.TransactionCommitError(e);
        }
      }

      async _rollback() {
        try {
          await this._query('ROLLBACK');
        } catch (e) {
          throw new this.constructor.TransactionRollbackError(e);
        }
      }

      async begin() {
        await this.acquireClient();

        try {
          await this._begin();
        } catch (e) {
          await this._rollback();
          await this.releaseClient();
          throw e;
        }
      }

      async commit() {
        try {
          await this._commit();
        } catch (e) {
          await this._rollback();
          throw e;
        } finally {
          await this.releaseClient();
        }
      }

      async rollback() {
        try {
          await this._rollback();
        } finally {
          await this.releaseClient();
        }
      }

      async query(sql) {
        if (!this.client) {
          await this.begin();
        }

        if (this.callback) {
          return this._query(sql);
        }

        try {
          return await this._query(sql);
        } catch (e) {
          await this.rollback();
          throw e;
        }
      }

      async execute() {
        if (!this.callback) {
          throw new this.constructor.TransactionError('no callback provided');
        }

        let result;

        await this.acquireClient();

        try {
          await this._begin();
          result = await this.callback(this);
          await this._commit();
        } catch (e) {
          await this._rollback();
          throw e;
        } finally {
          await this.releaseClient();
        }

        return result;
      }
    }

    class TransactionBeginError extends PostgresTransaction.TransactionError {}
    class TransactionCommitError extends PostgresTransaction.TransactionError {}
    class TransactionRollbackError extends PostgresTransaction.TransactionError {}

    PostgresTransaction.TransactionBeginError = TransactionBeginError;
    PostgresTransaction.TransactionCommitError = TransactionCommitError;
    PostgresTransaction.TransactionRollbackError = TransactionRollbackError;

    knorm.Transaction = PostgresTransaction;
  }

  updateQuery(knorm) {
    const { Query } = knorm;
    const knormPostgres = this;

    class PostgresQuery extends Query {
      constructor(model) {
        super(model);
        this.config.originalNotUpdated = this.config.notUpdated;
        this.config.notUpdated = this.config.originalNotUpdated.filter(
          field => field !== this.config.primary
        );

        const columnsToTypes = {};
        const columnsToFields = {};
        // TODO: allow configuring database types for every field
        Object.entries(this.config.fieldsToColumns).forEach(
          ([field, column]) => {
            let type;

            switch (this.config.fields[field].type) {
              case 'integer':
                type = 'int';
                break;

              case 'decimal':
                type = 'numeric';
                break;

              case 'boolean':
                type = 'bool';
                break;

              case 'json':
                type = 'json';
                break;

              case 'jsonb':
                type = 'jsonb';
                break;

              case 'binary':
                type = 'bytea';
                break;

              case 'date':
                type = 'date';
                break;

              case 'dateTime':
                type = 'timestamptz';
                break;

              // not necessary to type these
              // case 'string':
              // case 'text':
              // case 'email':
              // case 'uuid':
              // case 'uuid4':
              // type = 'text';
              // break;
            }

            columnsToTypes[`"${column}"`] = type;
            columnsToFields[column] = field;
          }
        );

        this.config.columnsToTypes = columnsToTypes;
        this.config.columnsToFields = columnsToFields;
      }

      patch(patch = true) {
        return this.setOption('patch', patch);
      }

      quote(value) {
        return `"${value}"`;
      }

      unquote(value) {
        return value.slice(1, -1);
      }

      // TODO: Add support for limit and offset options in joined queries - will
      // probably require joining with a subquery
      // TODO: strict mode: warn if invalid options are used depending on the method
      // e.g. using `where` for inserts
      async prepareSql(sql, options) {
        const { forInsert, forUpdate, forDelete, forFetch } = options;

        if (forInsert || forUpdate || forDelete) {
          if (this.options.fields) {
            sql.returning(this.getColumns(this.options.fields));
          }
        } else if (!this.config.joined) {
          if (forFetch && this.options.first) {
            // TODO: move this to core as `this.limit(1)`
            sql.limit(1);
          }

          if (this.options.limit !== undefined) {
            sql.limit(this.options.limit);
          }

          if (this.options.offset !== undefined) {
            sql.offset(this.options.offset);
          }
        }

        return super.prepareSql(sql, options);
      }

      // TODO: strict mode: warn/throw if a patch field is invalid
      // TODO: strict mode: warn/throw if a patch field is not a json(b) field
      isPatchedField(field) {
        field = this.config.fields[field];

        if (field.type !== 'json' && field.type !== 'jsonb') {
          return false;
        }

        const { patch } = this.options;

        if (patch === true) {
          return true;
        }

        const fields = Array.isArray(patch) ? patch : [patch];
        return fields.includes(field.name);
      }

      getCastFields(fields, { forInsert, forUpdate }) {
        if (forInsert || (forUpdate && !this.options.patch)) {
          return fields;
        }

        return fields.filter(field => !this.isPatchedField(field));
      }

      getRowValue({ field, column, value }, { forInsert, forUpdate }) {
        if (
          forInsert ||
          value instanceof this.sql ||
          (forUpdate && !this.options.patch) ||
          !this.isPatchedField(field)
        ) {
          return value;
        }

        if (Array.isArray(value) || typeof value !== 'object') {
          throw new this.constructor.QueryError(
            `${
              this.model.name
            }: cannot patch field \`${field}\` (JSON patching is only supported for objects)`
          );
        }

        const isJson = this.config.fields[field].type === 'json';
        let patch = isJson ? `${column}::jsonb` : column;

        Object.entries(value).forEach(([key, value]) => {
          patch = `jsonb_set(${patch}, '{${key}}', '${JSON.stringify(value)}')`;
        });

        if (isJson) {
          patch = `${patch}::json`;
        }

        return this.sql(patch);
      }

      // TODO: support using column names in the raw sql for multi-updates
      // TODO: document the "v" alias used in the multi-update query or allow it
      // to be configurable
      // TODO: v2: refactor prepareUpdateBatch => getUpdateBatch
      // TODO: throw if the update is empty (after excluding notUpdated). otherwise
      // it ends up being a hard-to-debug sql syntax error
      prepareUpdateBatch(batch) {
        let hasPrimary;
        const row = batch[0];
        const alias = this.quote('v');

        const update = Object.keys(row).reduce((columns, column) => {
          const field = this.config.columnsToFields[this.unquote(column)];

          if (field === this.config.primary && !hasPrimary) {
            hasPrimary = true;
          }

          if (!this.config.originalNotUpdated.includes(field)) {
            columns[column] = this.sql(`${alias}.${column}`);
          }

          return columns;
        }, {});

        if (!hasPrimary) {
          return super.prepareUpdateBatch(batch);
        }

        const table = this.getTable();
        const primary = this.getColumn(this.config.primary, {
          format: false,
          quote: true
        });

        return this.sql
          .update(table, update)
          .from(
            this.sql
              .values(batch)
              .as(alias)
              .columns()
              .types(this.config.columnsToTypes)
          )
          .where(`${table}.${primary}`, this.sql(`${alias}.${primary}`));
      }

      async acquireClient() {
        return knormPostgres.acquireClient();
      }

      async releaseClient(client) {
        return knormPostgres.releaseClient(client);
      }

      async query(sql) {
        const client = await this.acquireClient();

        try {
          const newSql = await this.beforeQuery(client, sql);

          sql = newSql || sql;

          const result = await client.query(formatSql(sql));
          const newResult = await this.afterQuery(client, sql, result);
          const { rows } = newResult || result;

          return rows;
        } finally {
          await this.releaseClient(client);
        }
      }

      // TODO: handle duplicate rows in inserted and updated data?
      async save(data, options) {
        const inserts = [];
        const updates = [];

        (Array.isArray(data) ? data : [data]).forEach(data => {
          if (data[this.config.primary] === undefined) {
            inserts.push(data);
          } else {
            updates.push(data);
          }
        });

        let inserted = await this.insert(inserts, options);
        const updated = await this.update(updates, options);

        if (!Array.isArray(inserted)) {
          inserted = [inserted];
        }

        const rows = inserted.concat(updated);
        const first = this.getOption('first');

        return first ? rows[0] : rows;
      }
    }

    PostgresQuery.prototype.sql = sqlBricksPostgres;

    class PostgresWhere extends PostgresQuery.Where {
      ilike(...args) {
        return this.addOption('ilike', args);
      }
    }

    PostgresWhere.prototype.sql = PostgresQuery.prototype.sql;

    PostgresQuery.Where = PostgresWhere;

    knorm.Query = knorm.Model.Query = PostgresQuery;
  }

  init(knorm) {
    if (!knorm) {
      throw new this.constructor.KnormPostgresError(
        'no Knorm instance provided'
      );
    }

    if (!(knorm instanceof Knorm)) {
      throw new this.constructor.KnormPostgresError(
        'invalid Knorm instance provided'
      );
    }

    this.updateField(knorm);
    this.updateQuery(knorm);
    this.updateTransation(knorm);
  }
}

KnormPostgres.KnormPostgresError = class KnormPostgresError extends Knorm.KnormError {};

module.exports = KnormPostgres;
