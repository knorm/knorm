const { Pool } = require('pg');
const knex = require('./knex');
const sqlBricksPostgres = require('sql-bricks-postgres');

const pool = new Pool(knex.client.config.connection);

const postgresPlugin = knorm => {
  class QueryForTests extends knorm.Query {
    quote(value) {
      return `"${value}"`;
    }

    async prepareQuery(query, options) {
      const { forInsert, forUpdate, forDelete, forFetch } = options;

      if ((forInsert || forUpdate || forDelete) && this.options.fields) {
        query.returning(this.getColumns(this.options.fields));
      }

      if (forFetch && this.options.first) {
        query.limit(1);
      }

      return super.prepareQuery(query, options);
    }

    async query(query) {
      const result = await pool.query(query.toParams());
      return result.rows;
    }
  }

  QueryForTests.prototype.sql = knorm.Query.Where.prototype.sql = sqlBricksPostgres;

  knorm.Query = knorm.Model.Query = QueryForTests;
};

module.exports = postgresPlugin;
