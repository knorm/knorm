const knex = require('knex');

module.exports = database =>
  knex({
    client: 'pg',
    connection: {
      database,
      host: process.env.PGHOST,
      port: 5432,
      user: 'postgres',
      password: '',
    },
  });
