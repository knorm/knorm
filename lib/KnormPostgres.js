const { Knorm, KnormError } = require('knorm');
const { Pool } = require('pg');
const sqlBricksPostgres = require('sql-bricks-postgres');

class KnormPostgresError extends KnormError {}

class KnormPostgres {
  constructor({ connection, initClient, restoreClient } = {}) {
    if (!connection) {
      throw new KnormPostgresError('no `connection` config provided');
    }

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

  async transact(transaction) {
    let result;

    await this.acquireClient();
    this.transacting = true;

    try {
      await this.query('BEGIN');
      try {
        result = await transaction();
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
      this.transacting = false;
      await this.releaseClient();
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

    knorm.Query = knorm.Model.Query = class PostgresQuery extends Query {
      constructor(model) {
        super(model);
        this.config.originalNotUpdated = this.config.notUpdated || [];
        this.config.notUpdated = [];
      }

      limit(limit) {
        this.builderOptions.limit = limit;
        return this;
      }

      offset(offset) {
        this.builderOptions.offset = offset;
        return this;
      }

      returning(...fields) {
        return this.addFields('returning', fields);
      }

      async prepareQuery(query, options) {
        if (options.forFetch && this.options.first) {
          query.limit(1);
        }

        return super.prepareQuery(query, options);
      }

      getUpdateQuery(batch) {
        if (!batch.length) {
          return super.getUpdateQuery(batch);
        }

        // TODO: these are initialised per batch, but in reality they are the same per batch
        const row = batch[0];
        const alias = this.quote('v');
        const table = this.getTable();
        const primary = this.quote(this.config.primary);
        const update = Object.keys(row).reduce((fields, field) => {
          if (!this.config.originalNotUpdated.includes(field)) {
            fields[this.getColumn(field, { table: false })] = this.sql(
              `${alias}.${this.quote(field)}`
            );
          }
          return fields;
        }, {});

        return this.sql
          .update(table, update)
          .from(
            this.sql
              .values(batch)
              .as(alias)
              .columns()
              .types()
          )
          .where(`${table}.${primary}`, this.sql(`${alias}.${primary}`));
      }

      async query(query) {
        const result = await knormPostgres.query(query);
        return result.rows;
      }

      async save(data, options) {
        if (!Array.isArray(data)) {
          data = [data];
        }

        const updates = [];
        const inserts = data.filter(data => {
          if (data[this.config.primary] === undefined) {
            return true;
          }
          updates.push(data);
          return false;
        });

        // TODO: handle duplicate rows in inserted and updated?
        const inserted = await this.insert(inserts, options);
        const updated = await this.update(updates, options);

        return inserted.concat(updated);
      }
    };

    knorm.Query.sql = sqlBricksPostgres;
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
