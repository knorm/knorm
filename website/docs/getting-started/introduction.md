---
title: Introduction
---

## What Knorm is

Knorm is a collection of classes that allow creating JavaScript
[ORM's](https://en.wikipedia.org/wiki/Object-relational_mapping) to make it
easier to work with databases. It's main goal is to enable issuing database
queries with code written in plain JavaScript.

### Typical use-cases

Knorm can be configured to work with any existing database without requiring any
changes to the database layer. It allows creating multiple ORM's in the same
codebase – be it a Node.js application or otherwise – which allows scoped usage
or gradual migration of an existing codebase.

Knorm can be used on on the browser for some limited use-cases:

- Validating models on the browser, in addition to validating them on the
  server.
- Generating queries on the browser, purely for display. Queries generated on
  the browser should **never** be sent to the server for processing – this would make it possible for an attacker to send harmful queries to the same server.

:::tip info
Knorm relies on plugins to access the database. One may therefore create an ORM
that has no database access by exluding any of the database-access plugins.
:::

### Supported environments

These environments are currently supported:

<!-- TODO: add link to @knorm/postgres -->

| Environment | Value    | Description                                                                     |
| ----------- | -------- | ------------------------------------------------------------------------------- |
| JavaScript  | >= `ES6` | Knorm can be used on any JavaScript environment that supports ES6 (aka ES2015). |
| TypeScript  |          | Knorm is written in TypeScript and exports type definitions for all its code.   |
| PostgreSQL  | >= `9.6` | PostgreSQL support is provided via the @knorm/postgres plugin.                  |

:::tip info
Support for more databases is on the roadmap.
:::

## What Knorm is not

Knorm does not create or run any database migrations (creating or altering
tables, columns, indexes etc). For creating and running migrations,
consider a library such as [Knex.js](http://knexjs.org).

It does not generate models from existing database schema, although this is
intended to be a feature in the future.
