const knex = require('knex');

module.exports = database =>
  knex({
    client: 'pg',
    connection: {
      database,
      host: 'postgres',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
    },
  });
