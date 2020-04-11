exports.up = async knex =>
  knex.schema.createTable('message', table => {
    table.increments('id').primary();
    table.text('text').notNullable();
    table.boolean('read').notNullable();
    table
      .integer('sender')
      .references('id')
      .inTable('user');
    table
      .integer('receiver')
      .references('id')
      .inTable('user');
    table.timestamps();
  });

exports.down = async knex => knex.schema.dropTable('message');
