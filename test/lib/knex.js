const knex = require('knex');
const { config } = require('knorm-postgres');

let client;
module.exports = () => {
  if (!client) {
    client = knex({
      client: 'pg',
      connection: config
    });
  }
  return client;
};
