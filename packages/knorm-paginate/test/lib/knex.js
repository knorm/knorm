const knex = require('knex');

module.exports = knex({
  client: 'pg',
  connection: {
    host: process.env.PGHOST || '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'knorm-paginate'
  }
});
