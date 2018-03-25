const knex = require('knex');
const knorm = require('knorm');
const knormTimestamps = require('knorm-timestamps');

const orm = knorm({
  knex: knex({
    client: 'pg',
    connection: 'postgres://postgres:@127.0.0.1:5432/postgres'
  })
}).use(knormTimestamps());

module.exports = orm;
