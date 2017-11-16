<a name="0.9.1"></a>
## [0.9.1](https://github.com/joelmukuthu/knorm/compare/v0.9.0...v0.9.1) (2017-11-01)


### Bug Fixes

* **Transaction:** fix Promise interface ([6c44faf](https://github.com/joelmukuthu/knorm/commit/6c44faf))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/joelmukuthu/knorm/compare/v0.8.1...v0.9.0) (2017-11-01)


### Bug Fixes

* **Field:** call custom validators if the value is `null` ([4c977a2](https://github.com/joelmukuthu/knorm/commit/4c977a2))
* **Field:** do not share `any` and `date` validators ([28a6c09](https://github.com/joelmukuthu/knorm/commit/28a6c09))
* **Field:** fix JSON validation ([890fca2](https://github.com/joelmukuthu/knorm/commit/890fca2))
* **Field:** make validateTypeWith private ([469ce0e](https://github.com/joelmukuthu/knorm/commit/469ce0e))
* **Field:** match error messages with config options ([4766cb1](https://github.com/joelmukuthu/knorm/commit/4766cb1))
* **Field:** stop sharing validators ([3df91e4](https://github.com/joelmukuthu/knorm/commit/3df91e4))
* **Model:** cast should not be async ([9ace467](https://github.com/joelmukuthu/knorm/commit/9ace467))
* **Query:** always return arrays from query methods ([33b882c](https://github.com/joelmukuthu/knorm/commit/33b882c))
* **Query:** return an array from Query.prototype.insert ([34f243e](https://github.com/joelmukuthu/knorm/commit/34f243e))
* **QueryError:** fix errorneous truncating of some knex errors ([779b1a9](https://github.com/joelmukuthu/knorm/commit/779b1a9))


### Features

* **Model:** validate field and virtual names ([bcbde2c](https://github.com/joelmukuthu/knorm/commit/bcbde2c))



<a name="0.8.1"></a>
## [0.8.1](https://github.com/joelmukuthu/knorm/compare/v0.8.0...v0.8.1) (2017-10-06)


### Features

* **Query:** support returning the first updated/deleted model ([8f94c73](https://github.com/joelmukuthu/knorm/commit/8f94c73))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/joelmukuthu/knorm/compare/v0.7.3...v0.8.0) (2017-10-05)


### Code Refactoring

* **Query:** do not special-case instances with an id ([e82173d](https://github.com/joelmukuthu/knorm/commit/e82173d))


### Features

* **Model:** ensure id is set for db operations on instances ([5c8163a](https://github.com/joelmukuthu/knorm/commit/5c8163a))


### BREAKING CHANGES

* **Query:** to conform with other Query methods, update now
always resolves with an array. If passed an instance with an id,
it no longer adds the "where id" clause, this has instead moved
to Model.prototype.update (similar to Model.prototype.fetch and
Model.prototype.delete)



<a name="0.7.3"></a>
## [0.7.3](https://github.com/joelmukuthu/knorm/compare/v0.7.2...v0.7.3) (2017-10-04)


### Bug Fixes

* **Model:** always pass the id for instance db operations ([2b2fede](https://github.com/joelmukuthu/knorm/commit/2b2fede))
* **package:** update validator to version 9.0.0 ([57354f7](https://github.com/joelmukuthu/knorm/commit/57354f7))



<a name="0.7.2"></a>
## [0.7.2](https://github.com/joelmukuthu/knorm/compare/v0.7.1...v0.7.2) (2017-09-05)


### Bug Fixes

* **Field:** add validator methods per type ([aa52e26](https://github.com/joelmukuthu/knorm/commit/aa52e26))
* **Field:** avoid schema validation for json strings ([7a68ae8](https://github.com/joelmukuthu/knorm/commit/7a68ae8))
* **Field:** do not validate json(b) types ([86b9479](https://github.com/joelmukuthu/knorm/commit/86b9479))
* **Query:** do not throw require errors for innerJoins ([9a58d4d](https://github.com/joelmukuthu/knorm/commit/9a58d4d))


### Features

* **Field:** add 'number' type ([776498e](https://github.com/joelmukuthu/knorm/commit/776498e))
* **Field:** add support for 'regex' validators ([893aca8](https://github.com/joelmukuthu/knorm/commit/893aca8))
* **Query:** add 'lean' option ([237a627](https://github.com/joelmukuthu/knorm/commit/237a627))



<a name="0.7.1"></a>
## [0.7.1](https://github.com/joelmukuthu/knorm/compare/v0.7.0...v0.7.1) (2017-08-30)


### Bug Fixes

* **Field:** allow null values for json schema validators ([64fc7f0](https://github.com/joelmukuthu/knorm/commit/64fc7f0))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/joelmukuthu/knorm/compare/v0.6.2...v0.7.0) (2017-08-30)


### Bug Fixes

* **Field:** fix error message path for json-array fields ([6a382a4](https://github.com/joelmukuthu/knorm/commit/6a382a4))
* **Field:** fix error messages for schema fields ([ca99958](https://github.com/joelmukuthu/knorm/commit/ca99958))
* **Query:** cast models after validation ([a51d33f](https://github.com/joelmukuthu/knorm/commit/a51d33f))


### Code Refactoring

* **Field:** name cast functions explicitly ([2e192e1](https://github.com/joelmukuthu/knorm/commit/2e192e1))
* **Field:** setModel => updateModel ([b4f0833](https://github.com/joelmukuthu/knorm/commit/b4f0833))


### Features

* support json schema validation ([46dfd72](https://github.com/joelmukuthu/knorm/commit/46dfd72))
* **Field:** add support for 'any' field types ([af4cde4](https://github.com/joelmukuthu/knorm/commit/af4cde4))
* **Field:** add support for date types ([6b2adf7](https://github.com/joelmukuthu/knorm/commit/6b2adf7))
* **Field:** add support for email types ([cec2115](https://github.com/joelmukuthu/knorm/commit/cec2115))
* **Field:** support 'equals' validator ([7c184e8](https://github.com/joelmukuthu/knorm/commit/7c184e8))
* **Field:** support jsonb field types ([456cc35](https://github.com/joelmukuthu/knorm/commit/456cc35))
* **Model:** add Model.count ([598ee98](https://github.com/joelmukuthu/knorm/commit/598ee98))
* **Query:** add support for SELECT DISTINCT ([1b1d358](https://github.com/joelmukuthu/knorm/commit/1b1d358))
* **Query:** support options for count() ([c251415](https://github.com/joelmukuthu/knorm/commit/c251415))


### BREAKING CHANGES

* **Query:** before, Query was casting models before validation,
which meant that the value passed to custom validators would already
be cast. this change might require custom validators to be updated.
* **Field:** refactored:
- Field.prototype.setModel to Field.prototype.updateModel
- Virtual.prototype.setModel to Virtual.prototype.updateModel

removed Field.prototype.setReference
* **Field:** field cast options changed from:

```js
Model.fields = {
  foo: {
    cast: {
      save() {},
      fetch() {}
    }
  }
};
```

to:

```js
Model.fields = {
  foo: {
    cast: {
      forSave() {},
      forFetch() {}
    }
  }
};
```



<a name="0.6.2"></a>
## [0.6.2](https://github.com/joelmukuthu/knorm/compare/v0.6.1...v0.6.2) (2017-08-18)


### Features

* **Query:** support batch inserts ([03ad68a](https://github.com/joelmukuthu/knorm/commit/03ad68a))
* **Query:** support passing options to CRUD methods ([9821f0c](https://github.com/joelmukuthu/knorm/commit/9821f0c))



<a name="0.6.1"></a>
## [0.6.1](https://github.com/joelmukuthu/knorm/compare/v0.6.0...v0.6.1) (2017-08-16)


### Features

* **Field:** add throwValidationError ([c234b33](https://github.com/joelmukuthu/knorm/commit/c234b33))
* **Model:** expose getField and getFields ([7bdc10e](https://github.com/joelmukuthu/knorm/commit/7bdc10e))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/joelmukuthu/knorm/compare/v0.5.0...v0.6.0) (2017-08-11)


* feat(field) support customizing validation errors ([4d6dcca](https://github.com/joelmukuthu/knorm/commit/4d6dcca))


### Bug Fixes

* **Query:** fix formatting of query error messages ([9bb85de](https://github.com/joelmukuthu/knorm/commit/9bb85de))


### Code Refactoring

* standardize options ([dd73690](https://github.com/joelmukuthu/knorm/commit/dd73690))


### BREAKING CHANGES

* **Query:** QueryError arguments have changed and KnormError
does not auto-format messages anymore
* due to:

- removed Field.errors in place of only Field.ValidationError
- changed ValidationError arguments
* Field.prototype.cast/Model.prototype.cast options are changed:

options.save => options.forSave
options.fetch => options.forFetch



<a name="0.5.0"></a>
# [0.5.0](https://github.com/joelmukuthu/knorm/compare/v0.4.2...v0.5.0) (2017-08-08)


### Features

* **Field:** allow overriding the cast method ([c3f86a5](https://github.com/joelmukuthu/knorm/commit/c3f86a5))


### BREAKING CHANGES

* **Field:** Field.prototype.hasCast refactored to Field.prototype._hasCast



<a name="0.4.2"></a>
## [0.4.2](https://github.com/joelmukuthu/knorm/compare/v0.4.1...v0.4.2) (2017-08-08)


### Features

* support inserting arrays of data ([da75f1e](https://github.com/joelmukuthu/knorm/commit/da75f1e))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/joelmukuthu/knorm/compare/v0.4.0...v0.4.1) (2017-08-04)


### Bug Fixes

* **Model:** only use the id for where clauses ([a26e42e](https://github.com/joelmukuthu/knorm/commit/a26e42e))


### Features

* **Query:** support updating multiple rows ([17f2ac5](https://github.com/joelmukuthu/knorm/commit/17f2ac5))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/joelmukuthu/knorm/compare/v0.3.0...v0.4.0) (2017-08-03)


### Bug Fixes

* **column:** copy column name when cloning field instances ([bfa01ec](https://github.com/joelmukuthu/knorm/commit/bfa01ec))


### Code Refactoring

* Model.idField => Model.fieldNames.id ([45ade15](https://github.com/joelmukuthu/knorm/commit/45ade15))
* remove timestamps functionality ([a8192ee](https://github.com/joelmukuthu/knorm/commit/a8192ee))


### Features

* **Model:** add Model.fieldNames ([9e22776](https://github.com/joelmukuthu/knorm/commit/9e22776))


### BREAKING CHANGES

* timestamps are now moved to knorm-timestamps plugin
* Model.idField => Model.fieldNames.id



<a name="0.3.0"></a>
# [0.3.0](https://github.com/joelmukuthu/knorm/compare/v0.2.4...v0.3.0) (2017-07-28)


### Code Refactoring

* **Query:** join/with -> leftJoin/innerJoin/join ([0a679c2](https://github.com/joelmukuthu/knorm/commit/0a679c2))


### BREAKING CHANGES

* **Query:** removed Query.prototype.with and changed Query.prototype.join
to do an inner join query



<a name="0.2.4"></a>
## [0.2.4](https://github.com/joelmukuthu/knorm/compare/v0.2.3...v0.2.4) (2017-07-28)


### Bug Fixes

* **Query:** fix field aliases ([b0badb8](https://github.com/joelmukuthu/knorm/commit/b0badb8))



<a name="0.2.3"></a>
## [0.2.3](https://github.com/joelmukuthu/knorm/compare/v0.2.2...v0.2.3) (2017-07-27)


### Bug Fixes

* **Model:** fix cloning of virtuals ([209923f](https://github.com/joelmukuthu/knorm/commit/209923f))



<a name="0.2.2"></a>
## [0.2.2](https://github.com/joelmukuthu/knorm/compare/v0.2.1...v0.2.2) (2017-07-27)


### Bug Fixes

* **Query:** use the table name in joined queries ([3636d41](https://github.com/joelmukuthu/knorm/commit/3636d41))


### Features

* **Query:** support 'raw' and 'column' where/having options ([b60ec1b](https://github.com/joelmukuthu/knorm/commit/b60ec1b))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/joelmukuthu/knorm/compare/v0.2.0...v0.2.1) (2017-07-26)


### Bug Fixes

* **Field:** copy cast functions when cloning ([8b997ed](https://github.com/joelmukuthu/knorm/commit/8b997ed))
* **Field:** fix validation of JSON strings ([b41e3ef](https://github.com/joelmukuthu/knorm/commit/b41e3ef))
* **Query:** disallow 'options' as an option ([3bdafcb](https://github.com/joelmukuthu/knorm/commit/3bdafcb))


### Features

* **Query:** add support for `require` with count() ([8ed78cf](https://github.com/joelmukuthu/knorm/commit/8ed78cf))
* add casting of field values ([562dfd4](https://github.com/joelmukuthu/knorm/commit/562dfd4))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/joelmukuthu/knorm/compare/v0.1.0...v0.2.0) (2017-07-21)


### Bug Fixes

* remove code duplicated by mistake ([69cef5b](https://github.com/joelmukuthu/knorm/commit/69cef5b))


### Features

* add KnormError ([f92722c](https://github.com/joelmukuthu/knorm/commit/f92722c))
* export custom error classes ([026c6a5](https://github.com/joelmukuthu/knorm/commit/026c6a5))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/joelmukuthu/knorm/compare/v0.0.2...v0.1.0) (2017-06-05)


### Bug Fixes

* **Field:** do not snake-case column names by default ([ae1d067](https://github.com/joelmukuthu/knorm/commit/ae1d067))
* **Query:** handle null responses from the database ([84b5566](https://github.com/joelmukuthu/knorm/commit/84b5566))
* **Query:** set default values for flags ([c1fe03a](https://github.com/joelmukuthu/knorm/commit/c1fe03a))


### Features

* **Model:** add db methods ([c34f9f7](https://github.com/joelmukuthu/knorm/commit/c34f9f7))
* **Model:** add delete methods ([74918a4](https://github.com/joelmukuthu/knorm/commit/74918a4))
* **Query:** add Query.prototype.delete ([8caed15](https://github.com/joelmukuthu/knorm/commit/8caed15))
* **Query:** add Query.prototype.save ([b80a695](https://github.com/joelmukuthu/knorm/commit/b80a695))
* **Query:** alias Query.prototype.transaction as 'within' ([496771f](https://github.com/joelmukuthu/knorm/commit/496771f))
* **Query:** alias Query.prototype.with as 'join' ([5afc820](https://github.com/joelmukuthu/knorm/commit/5afc820))
* **Query:** update by id if the id is set ([011d222](https://github.com/joelmukuthu/knorm/commit/011d222))



<a name="0.0.2"></a>
## 0.0.2 (2017-03-20)



