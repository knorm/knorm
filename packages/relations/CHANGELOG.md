# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [4.0.0](https://github.com/knorm/knorm/compare/@knorm/relations@4.0.0-alpha.1...@knorm/relations@4.0.0) (2020-04-14)

**Note:** Version bump only for package @knorm/relations





# [4.0.0-alpha.1](https://github.com/knorm/knorm/compare/@knorm/relations@4.0.0-alpha.0...@knorm/relations@4.0.0-alpha.1) (2020-04-14)


### Bug Fixes

* update @knorm/knorm's peer dependency version ([c489b79](https://github.com/knorm/knorm/commit/c489b79e1b46efe92b2a483b6ddd7a80e5f27152))
* update @knorm/postgres's peer dependency version ([5c56ddc](https://github.com/knorm/knorm/commit/5c56ddc7f1a9a942a70bef3ba16a059d4c52fb40))





# 4.0.0-alpha.0 (2020-04-14)


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





# [3.0.0](https://github.com/knorm/relations/compare/v2.0.0...v3.0.0) (2020-02-07)


### Bug Fixes

* **Query:** refactor handling of references ([caf792d](https://github.com/knorm/relations/commit/caf792d))
* support joining with children models ([6a544bc](https://github.com/knorm/relations/commit/6a544bc))
* throw an error if an `on` field (as a string) doesn't exist ([2f575bc](https://github.com/knorm/relations/commit/2f575bc))


### Features

* support `on` as an array ([4faab5e](https://github.com/knorm/relations/commit/4faab5e))


### BREAKING CHANGES

* Referencing a field on the parent join's model using
a string is no longer supported; it was only supported due to a bug.
Instead, use a Field instance:

```js
Model.fields = { id: 'integer' };

class User extends Model {}
class Image extends Model {}

Image.fields = {
  userId: { type: 'integer', references: User.fields.id }
};

Image.fetch({
  // wrong:
  // join: User.query.on('userId')
  // correct:
  join: User.query.on(Image.fields.userId)
});
```

However, fields on the same model can still be referenced by their
string field-name:

```js
User.fetch({ join: Image.query.on('userId') });
```

# [2.0.0](https://github.com/knorm/relations/compare/v1.3.1...v2.0.0) (2019-02-03)


### Bug Fixes

* **Query:** parse empty left-joined rows as empty array ([b67ed9a](https://github.com/knorm/relations/commit/b67ed9a)), closes [#8](https://github.com/knorm/relations/issues/8)
* **Query:** use `JOIN` clause for `join` query option ([b320cc4](https://github.com/knorm/relations/commit/b320cc4))


### chore

* update [@knorm](https://github.com/knorm)/knorm to v2 ([4c18e2f](https://github.com/knorm/relations/commit/4c18e2f))


### Features

* **Query:** support `fields: false` on joined queries ([a3efbf3](https://github.com/knorm/relations/commit/a3efbf3))


### BREAKING CHANGES

* This plugin now peer-depends on @knorm/knorm v2
* **Query:** Empty rows in left-joined data are now returned
as an empty array instead of `null`. However, if the `first`
option is configured on the joined query, the empty row is still
returned as `null`. This matches other Query methods (fetch etc).

## [1.3.1](https://github.com/knorm/relations/compare/v1.3.0...v1.3.1) (2018-11-15)


### Bug Fixes

* move reference-check error to preparation phase ([86954b6](https://github.com/knorm/relations/commit/86954b6))

<a name="1.3.0"></a>
# [1.3.0](https://github.com/knorm/relations/compare/v1.2.3...v1.3.0) (2018-09-30)


### Features

* support support multiple references ([9319531](https://github.com/knorm/relations/commit/9319531))

```js
class Foo extends Model {}
Foo.fields = { id: 'integer' };

class Bar extends Model {}
Bar.fields = { id: 'integer' };

class Quux extends Model {}
Foo.fields = {
  refId: {
    type: 'integer',
    // multiple references can be defined as an array
    // or as a function that returns an array
    references: [Foo.fields.id, Bar.fields.id]
  }
};

// these fetches would now supported:
Quux.fetch({ join: Foo });
Quux.fetch({ join: Bar });
Foo.fetch({ join: Quux });
Bar.fetch({ join: Quux });
```


<a name="1.2.3"></a>
## [1.2.3](https://github.com/knorm/relations/compare/v1.2.2...v1.2.3) (2018-09-19)


### Bug Fixes

* fix handling of `first` on joined queries ([165ddb9](https://github.com/knorm/relations/commit/165ddb9))



<a name="1.2.2"></a>
## [1.2.2](https://github.com/knorm/relations/compare/v1.2.1...v1.2.2) (2018-09-19)


### Bug Fixes

* maintain sort order defined with `orderBy` ([89a3343](https://github.com/knorm/relations/commit/89a3343))



<a name="1.2.1"></a>
## [1.2.1](https://github.com/knorm/relations/compare/v1.2.0...v1.2.1) (2018-08-13)



<a name="1.2.0"></a>
# [1.2.0](https://github.com/knorm/relations/compare/v1.1.4...v1.2.0) (2018-08-09)


### Bug Fixes

* `on` does not support multiple fields ([80788d8](https://github.com/knorm/relations/commit/80788d8))
* allow replacing existing fields with joined data ([15243b9](https://github.com/knorm/relations/commit/15243b9))


### Features

* support `on` as a field instance ([27a1bc1](https://github.com/knorm/relations/commit/27a1bc1))
* support self-referencing models ([312f106](https://github.com/knorm/relations/commit/312f106))



<a name="1.1.4"></a>
## [1.1.4](https://github.com/knorm/relations/compare/v1.1.3...v1.1.4) (2018-07-06)



<a name="1.1.3"></a>
## [1.1.3](https://github.com/knorm/relations/compare/v1.1.2...v1.1.3) (2018-07-06)


### Bug Fixes

* ensure joined data is `null` if the row is empty ([3f0143b](https://github.com/knorm/relations/commit/3f0143b))



<a name="1.1.2"></a>
## [1.1.2](https://github.com/knorm/relations/compare/v1.1.1...v1.1.2) (2018-07-06)


### Bug Fixes

* add a property to indicate joined queries ([065e272](https://github.com/knorm/relations/commit/065e272))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/knorm/relations/compare/v1.1.0...v1.1.1) (2018-06-27)


### Bug Fixes

* delete reference functions when a field is removed ([342aa93](https://github.com/knorm/relations/commit/342aa93))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/knorm/relations/compare/v1.0.0...v1.1.0) (2018-06-27)


### Features

* support `references` as a function ([b31b046](https://github.com/knorm/relations/commit/b31b046))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/knorm/relations/compare/29b97e8...v1.0.0) (2018-06-27)


### Bug Fixes

* delete model references when there are no field references ([2f4524c](https://github.com/knorm/relations/commit/2f4524c))
* do not overwrite Field from parent Model ([e995bf6](https://github.com/knorm/relations/commit/e995bf6))
* include referenced model as `null` when no rows are matched ([29b97e8](https://github.com/knorm/relations/commit/29b97e8))
* require primary or unique fields for joins ([8de149c](https://github.com/knorm/relations/commit/8de149c))


### Features

* add plugin name ([bc53386](https://github.com/knorm/relations/commit/bc53386))
* allow disabling check for unique field ([7d6db8a](https://github.com/knorm/relations/commit/7d6db8a))
* remove field references when a field is removed ([ef297c2](https://github.com/knorm/relations/commit/ef297c2))
