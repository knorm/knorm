const knorm = require('@knorm/knorm');
const knormTimestamps = require('@knorm/timestamps');
const knormPostgres = require('@knorm/postgres');
const knormRelations = require('@knorm/relations');
const { connection } = require('./knexfile');

module.exports = knorm()
  .use(knormPostgres({ connection }))
  .use(knormRelations())
  .use(knormTimestamps());
