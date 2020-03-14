const { Knorm } = require('@knorm/knorm');
const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const sqlBricksPostgres = require('sql-bricks-postgres');

class KnormPostgres {
  constructor({ connection, name = 'postgres' } = {}) {
    this.name = name;
    this.pool = new Pool(
      typeof connection === 'string' ? parse(connection) : connection
    );
  }

  updateField(knorm) {
    const { Field } = knorm;

    class PostgresField extends Field {
      // TODO: v2: auto-cast decimal fields from string on fetch
      cast(value, modelInstance, options) {
        if (
          (this.type === 'json' || this.type === 'jsonb') &&
          !(value instanceof knorm.Query.prototype.sql) &&
          options.forSave &&
          !(this.castors && this.castors.forSave) &&
          value !== null
        ) {
          return JSON.stringify(value);
        }

        return super.cast(value, modelInstance, options);
      }

      validateIsString(value, type) {
        super.validateIsString(value, type);
        this.validateMaxLengthIs(value, 255);
      }
    }

    knorm.updateField(PostgresField);
  }

  updateConnection(knorm) {
    const knormPostgres = this;

    class PostgresConnection extends knorm.Connection {
      async create() {
        this.client = await knormPostgres.pool.connect();
      }

      async query(sql) {
        const { rows } = await this.client.query(sql);

        return rows;
      }

      async close(error) {
        return this.client.release(error);
      }
    }

    knorm.updateConnection(PostgresConnection);
  }

  updateQuery(knorm) {
    const { Query } = knorm;

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

              case 'uuid':
              case 'uuid4':
                type = 'uuid';
                break;

              // not necessary to type these
              // case 'string':
              // case 'text':
              // case 'email':
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
      async prepareSql(sql) {
        const { forInsert, forUpdate, forDelete, forFetch } = this.config;

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

        return super.prepareSql(sql);
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

      getCastFields(fields) {
        const { forInsert, forUpdate } = this.config;

        if (forInsert || (forUpdate && !this.options.patch)) {
          return fields;
        }

        return fields.filter(field => !this.isPatchedField(field));
      }

      getRowValue({ field, column, value }) {
        const { forInsert, forUpdate } = this.config;

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
        const values = [];
        const addValue = value => `$${values.push(value)}`;

        Object.entries(value).forEach(([key, value]) => {
          if (value !== undefined) {
            patch = `jsonb_set(${patch}, ${addValue(`{${key}}`)}, ${addValue(
              JSON.stringify(value)
            )})`;
          }
        });

        if (isJson) {
          patch = `${patch}::json`;
        }

        return this.sql(patch, values);
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
        const primary = this.config.primary;

        const update = Object.keys(row).reduce((columns, column) => {
          const field = this.config.columnsToFields[this.unquote(column)];

          if (field === primary && !hasPrimary) {
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

        return this.sql
          .update(this.getTable(), update)
          .from(
            this.sql
              .values(batch)
              .as(alias)
              .columns()
              .types(this.config.columnsToTypes)
          )
          .where(
            this.getColumn(primary),
            this.sql(`${alias}.${this.getColumn(primary, { format: false })}`)
          );
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

    knorm.updateQuery(PostgresQuery);
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
    this.updateConnection(knorm);
  }
}

KnormPostgres.KnormPostgresError = class KnormPostgresError extends Knorm.KnormError {};

module.exports = KnormPostgres;
