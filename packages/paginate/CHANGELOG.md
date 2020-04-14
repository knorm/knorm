# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.0.0](https://github.com/knorm/knorm/compare/@knorm/paginate@3.0.0-alpha.1...@knorm/paginate@3.0.0) (2020-04-14)

**Note:** Version bump only for package @knorm/paginate





# [3.0.0-alpha.1](https://github.com/knorm/knorm/compare/@knorm/paginate@3.0.0-alpha.0...@knorm/paginate@3.0.0-alpha.1) (2020-04-14)


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





# [3.0.0](https://github.com/knorm/paginate/compare/v2.0.0...v3.0.0) (2019-04-16)

### REMOVED FROM NPM

This version was published erroneously and was therefore unpublished.

# [2.0.0](https://github.com/knorm/paginate/compare/v1.2.0...v2.0.0) (2019-02-03)


### chore

* update [@knorm](https://github.com/knorm)/knorm to v2 ([52f54d1](https://github.com/knorm/paginate/commit/52f54d1))


### Code Refactoring

* refactor Query.prototype.count to use Query.prototpye.fetch ([afc7195](https://github.com/knorm/paginate/commit/afc7195))


### BREAKING CHANGES

* This plugin now peer-depends on @knorm/knorm v2
* Removed `Query.CountError`. Instead, a
`Query.FetchError` is thrown.

<a name="1.2.0"></a>
# [1.2.0](https://github.com/knorm/paginate/compare/v1.1.0...v1.2.0) (2018-08-19)


### Features

* support pagination ([fbf5e98](https://github.com/knorm/paginate/commit/fbf5e98))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/knorm/paginate/compare/v1.0.0...v1.1.0) (2018-07-26)


### Features

* add the failing sql to count errors ([de8aa5a](https://github.com/knorm/paginate/commit/de8aa5a))
* enhance count error stack trace in debug mode ([b0c78ef](https://github.com/knorm/paginate/commit/b0c78ef))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/knorm/paginate/compare/56bbdc4...v1.0.0) (2018-06-27)


### Bug Fixes

* do not disable unique-field-check entirely ([2a4f55a](https://github.com/knorm/paginate/commit/2a4f55a))
* enable joins when counting ([56bbdc4](https://github.com/knorm/paginate/commit/56bbdc4))


### Features

* add plugin name ([256c639](https://github.com/knorm/paginate/commit/256c639))
