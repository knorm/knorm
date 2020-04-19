import { Pool } from 'pg';
import sqlBricksPostgres from 'sql-bricks-postgres';
import { knex } from './knex';
import { Plugin } from '../src/Plugin';

class PostgresPlugin extends Plugin {
  pool = new Pool(
    // a test in packages/knorm/test/Transaction.spec.js depends on
    // idleTimeoutMillis being 10
    Object.assign({ idleTimeoutMillis: 10 }, knex.client.config.connection)
  );

  init(knorm) {
    const pool = this.pool;

    knorm.updateConnection(
      class ConnectionForTests extends knorm.Connection {
        async create() {
          this.client = await pool.connect();
        }

        async query(sql) {
          const { rows } = await this.client.query(sql);
          return rows;
        }

        async close(error) {
          return this.client.release(error);
        }
      }
    );

    class QueryForTests extends knorm.Query {
      quote(value) {
        return `"${value}"`;
      }

      async prepareSql(sql) {
        const { forInsert, forUpdate, forDelete, forFetch } = this.config;

        if ((forInsert || forUpdate || forDelete) && this.options.fields) {
          sql.returning(this.getColumns(this.options.fields));
        }

        if (forFetch && this.options.first) {
          sql.limit(1);
        }

        return super.prepareSql(sql);
      }
    }

    knorm.updateQuery(QueryForTests);

    QueryForTests.prototype.sql = sqlBricksPostgres;
    knorm.Query.Where.prototype.sql = sqlBricksPostgres;
  }
}

export const postgresPlugin = new PostgresPlugin();
