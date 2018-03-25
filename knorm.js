const knexConfig = require('./knexfile');
const makeKnex = require('knex');
const makeKnorm = require('knorm');
const knormTimestamps = require('knorm-timestamps');
const { snakeCase: fieldToColumm } = require('lodash');

const knex = makeKnex(knexConfig);
const orm = makeKnorm({ knex, fieldToColumm }).use(knormTimestamps());

module.exports = orm;
