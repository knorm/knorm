module.exports = {
  client: 'pg',
  connection: {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: 'postgres',
    password: 'postgres',
    database: 'knorm-example',
  },
};
