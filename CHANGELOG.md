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
