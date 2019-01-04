const { Pool } = require('pg');
const knex = require('./knex');
const sqlBricksPostgres = require('sql-bricks-postgres');

const pool = new Pool(knex.client.config.connection);

const postgresPlugin = knorm => {
  class ConnectionForTests extends knorm.Connection {
    async create() {
      this.client = await pool.connect();
    }

    async query(sql) {
      const { rows } = await this.client.query(sql);
      return rows;
    }

    async close() {
      return this.client.release();
    }
  }

  knorm.Connection = ConnectionForTests;
  knorm.Transaction.Connection = ConnectionForTests;
  knorm.Query.Connection = ConnectionForTests;
  knorm.Model.Query.Connection = ConnectionForTests;

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
  }

  QueryForTests.prototype.sql = sqlBricksPostgres;
  knorm.Query.Where.prototype.sql = sqlBricksPostgres;

  knorm.Query = knorm.Model.Query = QueryForTests;
};

module.exports = postgresPlugin;
