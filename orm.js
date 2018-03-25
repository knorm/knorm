const knexConfig = require('./knexfile');
const makeKnex = require('knex');
const makeKnorm = require('knorm');
const knormTimestamps = require('knorm-timestamps');

const knex = makeKnex(knexConfig);
const orm = makeKnorm({ knex }).use(knormTimestamps());

module.exports = orm;
