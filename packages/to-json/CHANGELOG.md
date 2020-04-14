# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.0.0](https://github.com/knorm/knorm/compare/@knorm/to-json@3.0.0-alpha.1...@knorm/to-json@3.0.0) (2020-04-14)

**Note:** Version bump only for package @knorm/to-json





# [3.0.0-alpha.1](https://github.com/knorm/knorm/compare/@knorm/to-json@3.0.0-alpha.0...@knorm/to-json@3.0.0-alpha.1) (2020-04-14)


### Bug Fixes

* update @knorm/knorm's peer dependency version ([c489b79](https://github.com/knorm/knorm/commit/c489b79e1b46efe92b2a483b6ddd7a80e5f27152))





# 3.0.0-alpha.0 (2020-04-14)


### Features

* add typescript type definitions ([2a97c00](https://github.com/knorm/knorm/commit/2a97c006725f8f79f744870f7ec7abeff6caa9f5))


### BREAKING CHANGES

* Replaced default exports with named exports. This
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





# [2.0.0](https://github.com/knorm/to-json/compare/v1.0.0...v2.0.0) (2019-02-03)


### chore

* update [@knorm](https://github.com/knorm)/knorm to v2 ([fe32cd1](https://github.com/knorm/to-json/commit/fe32cd1))


### BREAKING CHANGES

* This plugin now peer-depends on @knorm/knorm v2

<a name="1.0.0"></a>
# [1.0.0](https://github.com/knorm/to-json/compare/9ae4631...v1.0.0) (2018-07-30)


### Bug Fixes

* default `exclude` to  `[]` ([b84c660](https://github.com/knorm/to-json/commit/b84c660))


### Features

* support configuring `exclude` per model ([9ae4631](https://github.com/knorm/to-json/commit/9ae4631))
