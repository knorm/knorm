# knorm-example

[![build status](https://travis-ci.org/knorm/example.svg?branch=master)](https://travis-ci.org/knorm/example)

> An example project showcasing how to use
> [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm).

## Requirements

[docker](https://docs.docker.com/install/) and
[docker-compose](https://docs.docker.com/compose/install/) for creating a new
postgres container.

Alternatively, you can edit the [knexfile.js](./knexfile.js) and
[orm.js](./orm.js) to connect to an already existing postgres database. However,
note that migrations will be run agaisnt that database to create the example
tables.

## Usage

Clone this repository then run the `start` command:

```bash
git clone git@github.com:knorm/example.git knorm-example
cd knorm-example
npm install
npm start # also runs migrations against the newly created postgres container
```
