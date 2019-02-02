const knorm = require('@knorm/knorm');
const knormTimestamps = require('@knorm/timestamps');
const knormPostgres = require('@knorm/postgres');
const knormRelations = require('@knorm/relations');

const host = process.env.PGHOST || '127.0.0.1';
const connection = {
  host,
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'postgres'
};

module.exports = knorm()
  .use(knormPostgres({ connection }))
  .use(knormRelations())
  .use(knormTimestamps());
