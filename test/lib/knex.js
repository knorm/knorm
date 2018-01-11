const knex = require('knex');

module.exports = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'postgres'
  }
});
