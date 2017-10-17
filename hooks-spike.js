/* eslint-disable no-console */
const knex = require('test/lib/knex');

knex.client.config.wrapIdentifier = (value, wrap) => {
  console.log('wrapping', value, 'to', wrap(value));
  return wrap(value);
};

knex.client.config.postProcessResponse = (response, builder) => {
  console.log();
  console.log('post processing', response);
  console.log();
  console.log('builder', builder);
  return response;
};

const query = table => {
  const builder = knex(table);
  builder._knormModel = 'the model';
  return builder;
};

const func = async () => {
  await knex.schema.createTableIfNotExists('foo', table => table.string('bar'));
  const ret = await query('foo')
    .returning('*')
    .insert({ bar: 'bar' });

  await query('foo').select();
  await knex.schema.dropTableIfExists('foo');

  return ret;
};

func()
  .then(console.log)
  .catch(console.log)
  .then(process.exit);
