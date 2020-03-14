const knex = require('knex');

module.exports = knex({
  client: 'pg',
  connection: {
    host: process.env.PGHOST,
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'knorm-timestamps'
  }
});
