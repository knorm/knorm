import knex from 'knex';

export const createKnex = (database) =>
  knex({
    client: 'pg',
    connection: {
      database,
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: 'postgres',
      password: 'postgres',
    },
  });
