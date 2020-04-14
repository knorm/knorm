# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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





# [2.0.0](https://github.com/knorm/timestamps/compare/v1.0.0...v2.0.0) (2019-02-03)


### chore

* update [@knorm](https://github.com/knorm)/knorm to v2 ([93d9d8d](https://github.com/knorm/timestamps/commit/93d9d8d))


### BREAKING CHANGES

* This plugin now peer-depends on @knorm/knorm v2

<a name="1.0.0"></a>
# [1.0.0](https://github.com/knorm/timestamps/compare/v3.0.2-old...v1.0.0) (2018-09-30)


### Bug Fixes

* enable multi-updates ([c51277c](https://github.com/knorm/timestamps/commit/c51277c))
* throw KnormTimestampsError ([4ef05f2](https://github.com/knorm/timestamps/commit/4ef05f2))


### Features

* add plugin name ([b2afa35](https://github.com/knorm/timestamps/commit/b2afa35))


### Breaking Changes

* package was renamed to **@knorm/timestamps**


<a name="3.0.2-old"></a>
## [knorm-timestamps@3.0.2](https://github.com/knorm/timestamps/compare/v3.0.2...v3.0.2-old) (2017-12-29)



<a name="3.0.1-old"></a>
## [knorm-timestamps@3.0.1](https://github.com/knorm/timestamps/compare/v3.0.1...v3.0.1-old) (2017-12-28)


### Bug Fixes

* fix default values for `createdAt` and `updatedAt` ([23210f2](https://github.com/knorm/timestamps/commit/23210f2))



<a name="3.0.0-old"></a>
# [knorm-timestamps@3.0.0](https://github.com/knorm/timestamps/compare/v3.0.0...v3.0.0-old) (2017-12-23)


### Code Refactoring

* update code for the next knorm major version ([58d3742](https://github.com/knorm/timestamps/commit/58d3742))


### BREAKING CHANGES

* - createdAt and updatedAt fields are now always added to the model
- fields types and default values for createdAt and updatedAt are
  not configurable anymore. only field and column-names are.



<a name="2.0.6-old"></a>
## [knorm-timestamps@2.0.6](https://github.com/knorm/timestamps/compare/v2.0.6...v2.0.6-old) (2017-11-08)


### Bug Fixes

* **query:** pass query options along ([3020de9](https://github.com/knorm/timestamps/commit/3020de9))



<a name="2.0.5-old"></a>
## [knorm-timestamps@2.0.5](https://github.com/knorm/timestamps/compare/v2.0.5...v2.0.5-old) (2017-11-01)



<a name="2.0.4-old"></a>
## [knorm-timestamps@2.0.4](https://github.com/knorm/timestamps/compare/v2.0.4...v2.0.4-old) (2017-10-06)



<a name="2.0.3-old"></a>
## [knorm-timestamps@2.0.3](https://github.com/knorm/timestamps/compare/v2.0.3...v2.0.3-old) (2017-08-30)



<a name="2.0.2-old"></a>
## [knorm-timestamps@2.0.2](https://github.com/knorm/timestamps/compare/v2.0.2...v2.0.2-old) (2017-08-11)



<a name="2.0.1-old"></a>
## [knorm-timestamps@2.0.1](https://github.com/knorm/timestamps/compare/v2.0.1...v2.0.1-old) (2017-08-09)


### Bug Fixes

* avoid circular dependency issues ([fc394df](https://github.com/knorm/timestamps/commit/fc394df))



<a name="2.0.0-old"></a>
# [knorm-timestamps@2.0.0](https://github.com/knorm/timestamps/compare/v2.0.0...v2.0.0-old) (2017-08-04)


### Code Refactoring

* support explicitly setting default values ([374e7b1](https://github.com/knorm/timestamps/commit/374e7b1))


### Features

* support configuring field types ([637f1e9](https://github.com/knorm/timestamps/commit/637f1e9))


### BREAKING CHANGES

* the `addDefault` option is removed and replaced
with a `default` option



<a name="1.0.0-old"></a>
# [knorm-timestamps@1.0.0](https://github.com/knorm/timestamps/compare/v1.0.0...v1.0.0-old) (2017-08-03)


### Features

* add modelWithTimestamps ([36b19da](https://github.com/knorm/timestamps/commit/36b19da))
* add queryWithTimestamps and withTimestamps ([5e8b99e](https://github.com/knorm/timestamps/commit/5e8b99e))
