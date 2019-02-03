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
