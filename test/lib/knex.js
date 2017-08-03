const knex = require('knex');
const { config } = require('knorm-postgres');

const client = knex({
  client: 'pg',
  connection: config
});

module.exports = client;
