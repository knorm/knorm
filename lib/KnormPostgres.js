const { Knorm } = require('@knorm/knorm');
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const sqlBricksPostgres = require('sql-bricks-postgres');

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
      // TODO: auto-cast decimal fields from string on fetch
      cast(value, modelInstance, options) {
        if (this.type !== 'json' && this.type !== 'jsonb') {
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
        const { rows } = await this.client.query(
          typeof sql === 'string' ? sql : sql.toParams()
        );

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

      quote(value) {
        return `"${value}"`;
      }

      unquote(value) {
        return value.slice(1, -1);
      }

      // TODO: Add support for limit and offset options in joined queries will
      // probably require joining with a subquery
      async prepareSql(sql, options) {
        const { forInsert, forUpdate, forDelete, forFetch } = options;

        if ((forInsert || forUpdate || forDelete) && this.options.fields) {
          sql.returning(this.getColumns(this.options.fields));
        }

        if (!this.config.joined) {
          if (forFetch && this.options.first) {
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
        const result = await client.query(
          typeof sql === 'string' ? sql : sql.toParams()
        );

        await this.releaseClient(client);
        return result.rows;
      }

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

        // TODO: handle duplicate rows in inserted and updated?
        const inserted = await this.insert(inserts, options);
        const updated = await this.update(updates, options);

        return inserted.concat(updated);
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
