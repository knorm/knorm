const { Knorm, KnormError } = require('@knorm/knorm');
const { Pool } = require('pg');
const sqlBricksPostgres = require('sql-bricks-postgres');

class KnormPostgresError extends KnormError {}

class KnormPostgres {
  constructor({ connection, initClient, restoreClient } = {}) {
    this.pool = new Pool(
      typeof connection === 'string'
        ? { connectionString: connection }
        : connection
    );

    if (initClient) {
      this._initClient = initClient;
    }
    if (restoreClient) {
      this._restoreClient = restoreClient;
    }
  }

  _releaseClient() {
    this.client.release();
    this.client = null;
  }

  async acquireClient() {
    if (this.client) {
      return;
    }

    this.client = await this.pool.connect();

    if (this._initClient) {
      try {
        await this._initClient(this.client);
      } catch (e) {
        this._releaseClient();
        throw e;
      }
    }
  }

  async releaseClient() {
    if (!this.client) {
      return;
    }

    if (this._restoreClient) {
      try {
        await this._restoreClient(this.client);
      } catch (e) {
        this._releaseClient();
        throw e;
      }
    }

    this._releaseClient();
  }

  async query(query) {
    await this.acquireClient();

    const result = await this.client.query(
      typeof query === 'string' ? query : query.toParams()
    );

    if (!this.transacting) {
      await this.releaseClient();
    }

    return result;
  }

  // TODO: throw custom errors
  async transact(transaction) {
    let result;

    await this.acquireClient();
    this.transacting = true;

    try {
      await this.query('BEGIN');
      try {
        result = await transaction(this.client);
        await this.query('COMMIT');
      } catch (transactionError) {
        try {
          await this.query('ROLLBACK');
        } catch (rollbackError) {
          const error = new KnormPostgresError(
            'unable to roll back after a failed transaction'
          );
          error.transactionError = transactionError;
          error.rollbackError = rollbackError;
          throw error;
        }
        throw transactionError;
      }
    } finally {
      try {
        await this.releaseClient();
      } finally {
        this.transacting = false;
      }
    }

    return result;
  }

  updateField(knorm) {
    const { Field } = knorm;

    knorm.Field = knorm.Model.Field = class PostgresField extends Field {
      cast(value, modelInstance, options) {
        if (this.type !== 'json' && this.type !== 'jsonb') {
          return super.cast(value, modelInstance, options);
        }

        if (value !== null && options.forSave) {
          if (this.castors && this.castors.forSave) {
            return super.cast(value, modelInstance, options);
          }
          return JSON.stringify(value);
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

    knorm.Transaction = class PostgresTransaction extends Transaction {
      async execute() {
        return knormPostgres.transact(this.transaction);
      }
    };
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

        // TODO: allow configuring database types for every field
        const columnsToTypes = {};
        Object.entries(this.config.fieldsToColumns).forEach(
          ([field, column]) => {
            let type;

            // only a few types need to be special-cased
            switch (this.config.fields[field].type) {
              case 'date':
                type = 'date';
                break;

              case 'dateTime':
                // from the fact that knex creates dateTime as 'timestampz'
                type = 'timestamptz';
                break;
            }

            columnsToTypes[column] = type;
          }
        );

        this.config.columnsToTypes = columnsToTypes;
      }

      quote(value) {
        return `"${value}"`;
      }

      async prepareSql(sql, options) {
        const { forInsert, forUpdate, forDelete, forFetch } = options;

        if ((forInsert || forUpdate || forDelete) && this.options.fields) {
          sql.returning(this.getColumns(this.options.fields));
        }

        if (forFetch && this.options.first) {
          sql.limit(1);
        }

        if (this.options.limit) {
          sql.limit(this.options.limit);
        }

        if (this.options.offset) {
          sql.offset(this.options.offset);
        }

        return super.prepareSql(sql, options);
      }

      getUpdateSql(batch) {
        if (!batch.length) {
          return super.getUpdateSql(batch);
        }

        let hasPrimary;
        const row = batch[0];
        const alias = this.quote('v');
        const update = Object.keys(row).reduce((fields, field) => {
          if (field === this.config.primary && !hasPrimary) {
            hasPrimary = true;
          }

          if (!this.config.originalNotUpdated.includes(field)) {
            fields[this.getColumn(field, { table: false })] = this.sql(
              `${alias}.${this.quote(field)}`
            );
          }

          return fields;
        }, {});

        if (!hasPrimary) {
          return super.getUpdateSql(batch);
        }

        const table = this.getTable();
        const primary = this.quote(this.config.primary);

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

      async query(sql) {
        const result = await knormPostgres.query(sql);
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
      throw new KnormPostgresError('no Knorm instance provided');
    }

    if (!(knorm instanceof Knorm)) {
      throw new KnormPostgresError('invalid Knorm instance provided');
    }

    this.updateField(knorm);
    this.updateQuery(knorm);
    this.updateTransation(knorm);
  }
}

KnormPostgres.KnormPostgresError = KnormPostgresError;

module.exports = KnormPostgres;
