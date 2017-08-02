const knex = require('knex');

let client;
module.exports = () => {
  if (!client) {
    client = knex({
      client: 'pg',
      connection: {
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
        database: process.env.POSTGRES_DB || 'postgres'
      }
    });
  }
  return client;
};
