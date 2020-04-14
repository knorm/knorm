# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.0.0](https://github.com/knorm/knorm/compare/@knorm/soft-delete@3.0.0-alpha.1...@knorm/soft-delete@3.0.0) (2020-04-14)

**Note:** Version bump only for package @knorm/soft-delete





# [3.0.0-alpha.1](https://github.com/knorm/knorm/compare/@knorm/soft-delete@3.0.0-alpha.0...@knorm/soft-delete@3.0.0-alpha.1) (2020-04-14)


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





# [2.0.0](https://github.com/knorm/soft-delete/compare/v1.0.0...v2.0.0) (2019-02-03)


### chore

* update [@knorm](https://github.com/knorm)/knorm to v2 ([52475e5](https://github.com/knorm/soft-delete/commit/52475e5))


### BREAKING CHANGES

* This plugin now peer-depends on @knorm/knorm v2

<a name="1.0.0"></a>
# [1.0.0](https://github.com/knorm/soft-delete/compare/v2.1.2-old...v1.0.0) (2018-09-30)


### Bug Fixes

* throw KnormSoftDeleteError errors ([e009ddb](https://github.com/knorm/soft-delete/commit/e009ddb))


### Features

* add plugin name ([8b6e37c](https://github.com/knorm/soft-delete/commit/8b6e37c))


### Breaking Changes

* package was renamed to **@knorm/soft-delete**


<a name="2.1.2-old"></a>
## [knrom-soft-delete@2.1.2](https://github.com/knorm/soft-delete/compare/v2.1.2...v2.1.2-old) (2017-12-29)



<a name="2.1.1-old"></a>
## [knrom-soft-delete@2.1.1](https://github.com/knorm/soft-delete/compare/v2.1.1...v2.1.1-old) (2017-12-27)



<a name="2.1.0-old"></a>
# [knrom-soft-delete@2.1.0](https://github.com/knorm/soft-delete/compare/v2.1.0...v2.1.0-old) (2017-12-27)


### Features

* auto-set `deletedAt` if `deleted` is `true` ([314fb15](https://github.com/knorm/soft-delete/commit/314fb15))



<a name="2.0.0-old"></a>
# [knrom-soft-delete@2.0.0](https://github.com/knorm/soft-delete/compare/v2.0.0...v2.0.0-old) (2017-12-23)



<a name="1.1.7-old"></a>
## [knrom-soft-delete@1.1.7](https://github.com/knorm/soft-delete/compare/v1.1.7...v1.1.7-old) (2017-11-01)


### Bug Fixes

* **query:** restore now resolves with empty array ([5dd9b78](https://github.com/knorm/soft-delete/commit/5dd9b78))



<a name="1.1.6-old"></a>
## [knrom-soft-delete@1.1.6](https://github.com/knorm/soft-delete/compare/v1.1.6...v1.1.6-old) (2017-10-05)



<a name="1.1.5-old"></a>
## [knrom-soft-delete@1.1.5](https://github.com/knorm/soft-delete/compare/v1.1.5...v1.1.5-old) (2017-10-04)


### Bug Fixes

* pass query options down ([625484a](https://github.com/knorm/soft-delete/commit/625484a))
* use configured field-name ([2ca4361](https://github.com/knorm/soft-delete/commit/2ca4361))



<a name="1.1.4-old"></a>
## [knrom-soft-delete@1.1.4](https://github.com/knorm/soft-delete/compare/v1.1.4...v1.1.4-old) (2017-10-03)


### Bug Fixes

* always return an array from QueryWithSoftDelete.prototype.delete ([0c2467a](https://github.com/knorm/soft-delete/commit/0c2467a))



<a name="1.1.3-old"></a>
## [knrom-soft-delete@1.1.3](https://github.com/knorm/soft-delete/compare/v1.1.3...v1.1.3-old) (2017-08-30)


### Bug Fixes

* improve performance of withDeleted ([ea324e6](https://github.com/knorm/soft-delete/commit/ea324e6))



<a name="1.1.2-old"></a>
## [knrom-soft-delete@1.1.2](https://github.com/knorm/soft-delete/compare/v1.1.2...v1.1.2-old) (2017-08-11)



<a name="1.1.1-old"></a>
## [knrom-soft-delete@1.1.1](https://github.com/knorm/soft-delete/compare/v1.1.1...v1.1.1-old) (2017-08-09)


### Bug Fixes

* avoid circular dependency issues ([0694168](https://github.com/knorm/soft-delete/commit/0694168))



<a name="1.1.0-old"></a>
# [knrom-soft-delete@1.1.0](https://github.com/knorm/soft-delete/compare/v1.1.0...v1.1.0-old) (2017-08-04)


### Bug Fixes

* do not use OR WHERE for withDeleted ([8123e6e](https://github.com/knorm/soft-delete/commit/8123e6e))


### Features

* add hardDelete ([88e2779](https://github.com/knorm/soft-delete/commit/88e2779))
* add withDeleted and onlyDeleted ([414c1e3](https://github.com/knorm/soft-delete/commit/414c1e3))



<a name="1.0.0-old"></a>
# [knrom-soft-delete@1.0.0](https://github.com/knorm/soft-delete/compare/v1.0.0...v1.0.0-old) (2017-08-04)


### Features

* finish soft-delete implementation ([9493a74](https://github.com/knorm/soft-delete/commit/9493a74))
