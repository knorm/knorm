exports.up = async (knex) =>
  knex.schema.createTable('user', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable();
    table.timestamps();
  });

exports.down = async (knex) => knex.schema.dropTable('user');
