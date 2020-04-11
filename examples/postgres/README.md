# postgres-example

> An example project showcasing how to use Knorm with PostgreSQL.

This example connects to a postgres database, creates `user` and `message`
tables and then inserts and fetches rows from those tables.

The tables are created via [Knex.js](https://knexjs.org/) migrations while rows
are inserted and fetched with Knorm.

## Usage

Run the following commands to clone this repository, install dependencies and
run the example:

```bash
git clone git@github.com:knorm/knorm.git knorm
cd knorm
yarn install
yarn examples:postgres
```

The example runs in a docker container. This requires that you have
[docker](https://docs.docker.com/install/) and
[docker-compose](https://docs.docker.com/compose/install/) installed locally.
