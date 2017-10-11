const knex = require('knex');
const { config } = require('knorm-postgres');

module.exports = knex({
  client: 'pg',
  connection: config
});
