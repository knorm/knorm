## [1.3.3](https://github.com/knorm/postgres/compare/v1.3.2...v1.3.3) (2018-10-15)


### Bug Fixes

* **deps:** update dependency pg to v7.5.0 ([2219a72](https://github.com/knorm/postgres/commit/2219a72))

## [1.3.2](https://github.com/knorm/postgres/compare/v1.3.1...v1.3.2) (2018-10-09)


### Bug Fixes

* pin pg to 7.4.3 ([97bfb19](https://github.com/knorm/postgres/commit/97bfb19))

## [1.3.1](https://github.com/knorm/postgres/compare/v1.3.0...v1.3.1) (2018-10-03)


### Bug Fixes

* release the client if a one-off query fails ([63cea63](https://github.com/knorm/postgres/commit/63cea63))

<a name="1.3.0"></a>
# [1.3.0](https://github.com/knorm/postgres/compare/v1.2.2...v1.3.0) (2018-09-28)


### Features

* support { text, value } style raw queries ([eb599cf](https://github.com/knorm/postgres/commit/eb599cf))
* support before and after query hooks ([7c74c78](https://github.com/knorm/postgres/commit/7c74c78))



<a name="1.2.2"></a>
## [1.2.2](https://github.com/knorm/postgres/compare/v1.2.1...v1.2.2) (2018-09-25)


### Bug Fixes

* ignore `limit` and `offset` when unneeded ([59f830f](https://github.com/knorm/postgres/commit/59f830f))



<a name="1.2.1"></a>
## [1.2.1](https://github.com/knorm/postgres/compare/v1.2.0...v1.2.1) (2018-09-24)


### Bug Fixes

* handle `first` in Query.prototype.save ([3fdd008](https://github.com/knorm/postgres/commit/3fdd008))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/knorm/postgres/compare/v1.1.2...v1.2.0) (2018-09-23)


### Bug Fixes

* handle raw sql in JSON auto-casting ([c86f402](https://github.com/knorm/postgres/commit/c86f402))


### Features

* support json-patching for updates ([0d49635](https://github.com/knorm/postgres/commit/0d49635))



<a name="1.1.2"></a>
## [1.1.2](https://github.com/knorm/postgres/compare/v1.1.1...v1.1.2) (2018-08-19)


### Bug Fixes

* support `offset: 0` and `limit: 0` ([b370a4f](https://github.com/knorm/postgres/commit/b370a4f))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/knorm/postgres/compare/v1.1.0...v1.1.1) (2018-08-13)


### Bug Fixes

* format primary fields to columns in update query ([e1d2e1f](https://github.com/knorm/postgres/commit/e1d2e1f))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/knorm/postgres/compare/v1.0.1...v1.1.0) (2018-07-19)


### Features

* allow parsing options in a connection string ([ea1e625](https://github.com/knorm/postgres/commit/ea1e625))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/knorm/postgres/compare/v1.0.0...v1.0.1) (2018-07-06)


### Bug Fixes

* ignore `limit` and `offset` on joined queries ([87d9050](https://github.com/knorm/postgres/commit/87d9050))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/knorm/postgres/compare/8ed93f8...v1.0.0) (2018-06-27)


### Bug Fixes

* cast date and dateTime fields for update ([bdf0bbd](https://github.com/knorm/postgres/commit/bdf0bbd))
* **Field:** use user-configured cast function if set ([8ed93f8](https://github.com/knorm/postgres/commit/8ed93f8))
* allow updating all rows or with a where clause ([dc3a58f](https://github.com/knorm/postgres/commit/dc3a58f))
* configure placeholder ([25223dc](https://github.com/knorm/postgres/commit/25223dc))
* do not directly manipulate knorm query props ([982a412](https://github.com/knorm/postgres/commit/982a412))
* do not throw for already parsed JSON ([f679604](https://github.com/knorm/postgres/commit/f679604))
* enable multi-updating for all current Knorm field types ([ae003c6](https://github.com/knorm/postgres/commit/ae003c6))
* end transaction even if `restoreClient` fails ([551bfd2](https://github.com/knorm/postgres/commit/551bfd2))
* explicitly handle [@knorm](https://github.com/knorm)/postgres options ([5e3fc1f](https://github.com/knorm/postgres/commit/5e3fc1f))
* export the KnormPostgres constructor ([c17e73c](https://github.com/knorm/postgres/commit/c17e73c))
* fix inadvertent sharing of clients ([4b19ecf](https://github.com/knorm/postgres/commit/4b19ecf))
* fix scoped transaction model names ([3489b2f](https://github.com/knorm/postgres/commit/3489b2f))
* knorm => [@knorm](https://github.com/knorm)/knorm ([31a0329](https://github.com/knorm/postgres/commit/31a0329))
* move postgres-specific options from knorm ([8bdcb8c](https://github.com/knorm/postgres/commit/8bdcb8c))
* no need to update placeholder ([c8b860d](https://github.com/knorm/postgres/commit/c8b860d))
* parse json and jsonb fields after fetch ([0ace985](https://github.com/knorm/postgres/commit/0ace985))
* pass transaction to callback as parameter ([f8d5314](https://github.com/knorm/postgres/commit/f8d5314))
* setBuilderOption => setOption ([aaaeef9](https://github.com/knorm/postgres/commit/aaaeef9))


### Features

* add plugin name ([51e3412](https://github.com/knorm/postgres/commit/51e3412))
* hash all transaction models by name ([9d32f76](https://github.com/knorm/postgres/commit/9d32f76))
* make `connection` config optional ([a4edd86](https://github.com/knorm/postgres/commit/a4edd86))
* pass the client to the transaction callback ([bdce3ea](https://github.com/knorm/postgres/commit/bdce3ea))
* support `ilike` ([4738a41](https://github.com/knorm/postgres/commit/4738a41))
* support no-callback transactions ([198e25c](https://github.com/knorm/postgres/commit/198e25c))
