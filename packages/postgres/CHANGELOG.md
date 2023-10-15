# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.1](https://github.com/knorm/knorm/compare/@knorm/postgres@3.0.0...@knorm/postgres@3.0.1) (2023-10-15)

### Bug Fixes

- **deps:** update dependency sql-bricks-postgres to v0.6.0 ([ac0175e](https://github.com/knorm/knorm/commit/ac0175ebf422e8cf1cd616c9a48a76a44cb5031f))

# [3.0.0](https://github.com/knorm/knorm/compare/@knorm/postgres@3.0.0-alpha.1...@knorm/postgres@3.0.0) (2020-04-14)

**Note:** Version bump only for package @knorm/postgres

# [3.0.0-alpha.1](https://github.com/knorm/knorm/compare/@knorm/postgres@3.0.0-alpha.0...@knorm/postgres@3.0.0-alpha.1) (2020-04-14)

### Bug Fixes

- update @knorm/knorm's peer dependency version ([c489b79](https://github.com/knorm/knorm/commit/c489b79e1b46efe92b2a483b6ddd7a80e5f27152))
- update @knorm/relation's peer dependency version ([ed61ed6](https://github.com/knorm/knorm/commit/ed61ed6cdfaa272b5165e8265fe583bbf744959d))

# 3.0.0-alpha.0 (2020-04-14)

### Bug Fixes

- **deps:** update dependency pg to v8 ([7cf5599](https://github.com/knorm/knorm/commit/7cf5599a082c2c0dee099b3054025ee598eddf21))

### Features

- add typescript type definitions ([2a97c00](https://github.com/knorm/knorm/commit/2a97c006725f8f79f744870f7ec7abeff6caa9f5))

### BREAKING CHANGES

- **deps:** Updated dependency pg from v7 to v8
- Replaced default exports with named exports. This
  affects the factory functions that are the main package exports and
  applies to @knorm/knorm and ALL plugins.

Instead of:

```js
const knorm = require('@knorm/knorm');
const knormPostgres = require('@knorm/postgres');

const { Knorm } = knorm;
const { KnormPostgres } = knormPostgres;
```

Do:

```js
const { knorm, Knorm } = require('@knorm/knorm');
const { knormPostgres, KnormPostgres } = require('@knorm/postgres');
```

## [2.0.5](https://github.com/knorm/postgres/compare/v2.0.4...v2.0.5) (2019-07-29)

### Bug Fixes

- do not stringify null values ([#124](https://github.com/knorm/postgres/issues/124)) ([cd3514c](https://github.com/knorm/postgres/commit/cd3514c))

## [2.0.4](https://github.com/knorm/postgres/compare/v2.0.3...v2.0.4) (2019-07-24)

### Bug Fixes

- do not JSON.parse values already parsed by the postgres driver ([55eaf6b](https://github.com/knorm/postgres/commit/55eaf6b))

## [2.0.3](https://github.com/knorm/postgres/compare/v2.0.2...v2.0.3) (2019-07-24)

### Bug Fixes

- use bind parameter for json patches ([fd6b5fa](https://github.com/knorm/postgres/commit/fd6b5fa))

## [2.0.2](https://github.com/knorm/postgres/compare/v2.0.1...v2.0.2) (2019-03-13)

### Bug Fixes

- pass query errors to client.release ([035c5b5](https://github.com/knorm/postgres/commit/035c5b5))

## [2.0.1](https://github.com/knorm/postgres/compare/v2.0.0...v2.0.1) (2019-02-19)

### Bug Fixes

- enable updating `uuid` and `uuid4` type fields ([5bb9b98](https://github.com/knorm/postgres/commit/5bb9b98))

# [2.0.0](https://github.com/knorm/postgres/compare/v1.3.4...v2.0.0) (2019-02-03)

### Bug Fixes

- update multi-update code to handle table aliasing ([bcbe4d0](https://github.com/knorm/postgres/commit/bcbe4d0))

### chore

- update [@knorm](https://github.com/knorm)/knorm to v2 ([03da38b](https://github.com/knorm/postgres/commit/03da38b))

### Code Refactoring

- move connection handling into [@knorm](https://github.com/knorm)/knorm ([db2e46e](https://github.com/knorm/postgres/commit/db2e46e))
- remove `initClient` and `restoreClient` options ([4595588](https://github.com/knorm/postgres/commit/4595588))

### BREAKING CHANGES

- This plugin now peer-depends on @knorm/knorm v2
- Removed `initClient` and `restoreClient` options.
  Instead, use
  [Connection.prototype.create](https://knorm.netlify.com/api.md##connection-create)
  and
  [Connection.prototype.close](https://knorm.netlify.com/api.md##connection-close)
  for any logic to be run before creating and closing database
  connections.
- These changes depend on v2 of @knorm/knorm

## [1.3.4](https://github.com/knorm/postgres/compare/v1.3.3...v1.3.4) (2018-10-18)

### Bug Fixes

- **json-patching:** ignore `undefined` paths ([789a98c](https://github.com/knorm/postgres/commit/789a98c))

## [1.3.3](https://github.com/knorm/postgres/compare/v1.3.2...v1.3.3) (2018-10-15)

### Bug Fixes

- **deps:** update dependency pg to v7.5.0 ([2219a72](https://github.com/knorm/postgres/commit/2219a72))

## [1.3.2](https://github.com/knorm/postgres/compare/v1.3.1...v1.3.2) (2018-10-09)

### Bug Fixes

- pin pg to 7.4.3 ([97bfb19](https://github.com/knorm/postgres/commit/97bfb19))

## [1.3.1](https://github.com/knorm/postgres/compare/v1.3.0...v1.3.1) (2018-10-03)

### Bug Fixes

- release the client if a one-off query fails ([63cea63](https://github.com/knorm/postgres/commit/63cea63))

<a name="1.3.0"></a>

# [1.3.0](https://github.com/knorm/postgres/compare/v1.2.2...v1.3.0) (2018-09-28)

### Features

- support { text, value } style raw queries ([eb599cf](https://github.com/knorm/postgres/commit/eb599cf))
- support before and after query hooks ([7c74c78](https://github.com/knorm/postgres/commit/7c74c78))

<a name="1.2.2"></a>

## [1.2.2](https://github.com/knorm/postgres/compare/v1.2.1...v1.2.2) (2018-09-25)

### Bug Fixes

- ignore `limit` and `offset` when unneeded ([59f830f](https://github.com/knorm/postgres/commit/59f830f))

<a name="1.2.1"></a>

## [1.2.1](https://github.com/knorm/postgres/compare/v1.2.0...v1.2.1) (2018-09-24)

### Bug Fixes

- handle `first` in Query.prototype.save ([3fdd008](https://github.com/knorm/postgres/commit/3fdd008))

<a name="1.2.0"></a>

# [1.2.0](https://github.com/knorm/postgres/compare/v1.1.2...v1.2.0) (2018-09-23)

### Bug Fixes

- handle raw sql in JSON auto-casting ([c86f402](https://github.com/knorm/postgres/commit/c86f402))

### Features

- support json-patching for updates ([0d49635](https://github.com/knorm/postgres/commit/0d49635))

<a name="1.1.2"></a>

## [1.1.2](https://github.com/knorm/postgres/compare/v1.1.1...v1.1.2) (2018-08-19)

### Bug Fixes

- support `offset: 0` and `limit: 0` ([b370a4f](https://github.com/knorm/postgres/commit/b370a4f))

<a name="1.1.1"></a>

## [1.1.1](https://github.com/knorm/postgres/compare/v1.1.0...v1.1.1) (2018-08-13)

### Bug Fixes

- format primary fields to columns in update query ([e1d2e1f](https://github.com/knorm/postgres/commit/e1d2e1f))

<a name="1.1.0"></a>

# [1.1.0](https://github.com/knorm/postgres/compare/v1.0.1...v1.1.0) (2018-07-19)

### Features

- allow parsing options in a connection string ([ea1e625](https://github.com/knorm/postgres/commit/ea1e625))

<a name="1.0.1"></a>

## [1.0.1](https://github.com/knorm/postgres/compare/v1.0.0...v1.0.1) (2018-07-06)

### Bug Fixes

- ignore `limit` and `offset` on joined queries ([87d9050](https://github.com/knorm/postgres/commit/87d9050))

<a name="1.0.0"></a>

# [1.0.0](https://github.com/knorm/postgres/compare/8ed93f8...v1.0.0) (2018-06-27)

### Bug Fixes

- cast date and dateTime fields for update ([bdf0bbd](https://github.com/knorm/postgres/commit/bdf0bbd))
- **Field:** use user-configured cast function if set ([8ed93f8](https://github.com/knorm/postgres/commit/8ed93f8))
- allow updating all rows or with a where clause ([dc3a58f](https://github.com/knorm/postgres/commit/dc3a58f))
- configure placeholder ([25223dc](https://github.com/knorm/postgres/commit/25223dc))
- do not directly manipulate knorm query props ([982a412](https://github.com/knorm/postgres/commit/982a412))
- do not throw for already parsed JSON ([f679604](https://github.com/knorm/postgres/commit/f679604))
- enable multi-updating for all current Knorm field types ([ae003c6](https://github.com/knorm/postgres/commit/ae003c6))
- end transaction even if `restoreClient` fails ([551bfd2](https://github.com/knorm/postgres/commit/551bfd2))
- explicitly handle [@knorm](https://github.com/knorm)/postgres options ([5e3fc1f](https://github.com/knorm/postgres/commit/5e3fc1f))
- export the KnormPostgres constructor ([c17e73c](https://github.com/knorm/postgres/commit/c17e73c))
- fix inadvertent sharing of clients ([4b19ecf](https://github.com/knorm/postgres/commit/4b19ecf))
- fix scoped transaction model names ([3489b2f](https://github.com/knorm/postgres/commit/3489b2f))
- knorm => [@knorm](https://github.com/knorm)/knorm ([31a0329](https://github.com/knorm/postgres/commit/31a0329))
- move postgres-specific options from knorm ([8bdcb8c](https://github.com/knorm/postgres/commit/8bdcb8c))
- no need to update placeholder ([c8b860d](https://github.com/knorm/postgres/commit/c8b860d))
- parse json and jsonb fields after fetch ([0ace985](https://github.com/knorm/postgres/commit/0ace985))
- pass transaction to callback as parameter ([f8d5314](https://github.com/knorm/postgres/commit/f8d5314))
- setBuilderOption => setOption ([aaaeef9](https://github.com/knorm/postgres/commit/aaaeef9))

### Features

- add plugin name ([51e3412](https://github.com/knorm/postgres/commit/51e3412))
- hash all transaction models by name ([9d32f76](https://github.com/knorm/postgres/commit/9d32f76))
- make `connection` config optional ([a4edd86](https://github.com/knorm/postgres/commit/a4edd86))
- pass the client to the transaction callback ([bdce3ea](https://github.com/knorm/postgres/commit/bdce3ea))
- support `ilike` ([4738a41](https://github.com/knorm/postgres/commit/4738a41))
- support no-callback transactions ([198e25c](https://github.com/knorm/postgres/commit/198e25c))
