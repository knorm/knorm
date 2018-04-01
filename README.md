# knorm-example

> An example project showcasing how to use [Knorm](https://www.npmjs.com/package/knorm).

## Requirements

[docker](https://docs.docker.com/) and [docker-compose](https://docs.docker.com/compose/install/) for creating a new postgres container. Alternatively, you can edit the [knexfile.js](./knexfile.js) to connect to an already existing database.

## Usage

Clone this repository then run the `postgres` and `start` commands:

```bash
git clone git@github.com:joelmukuthu/knorm-example.git
cd knorm-example
npm install
npm run postgres # starts a postgres docker container
npm start # also runs migrations against the newly created postgres container
```
