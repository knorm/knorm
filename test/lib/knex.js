const knex = require('knex');

let client;
module.exports = () => {
    if (!client) {
        client = knex({
            client: 'pg',
            connection: {
                host: '127.0.0.1',
                user: 'postgres',
                database: 'postgres',
            },
        });
    }
    return client;
};
