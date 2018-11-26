const { Pool } = require('pg');
const knex = require('./knex');
const sqlBricksPostgres = require('sql-bricks-postgres');

const pool = new Pool(knex.client.config.connection);

const postgresPlugin = knorm => {
  class QueryForTests extends knorm.Query {
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

      return super.prepareSql(sql, options);
    }

    async acquireClient() {
      return pool.connect();
    }

    async releaseClient(client) {
      client.release();
    }

    formatSql(sql) {
      return sql.toParams();
    }

    async runQuery(client, sql) {
      return client.query(sql);
    }

    parseResult(result) {
      return result.rows;
    }
  }

  QueryForTests.prototype.sql = knorm.Query.Where.prototype.sql = sqlBricksPostgres;

  knorm.Query = knorm.Model.Query = QueryForTests;
};

module.exports = postgresPlugin;
