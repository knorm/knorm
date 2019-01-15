# @knorm/virtuals

[![npm version](https://badge.fury.io/js/%40knorm%2Fvirtuals.svg)](https://badge.fury.io/js/%40knorm%2Fvirtuals)
[![build status](https://travis-ci.org/knorm/virtuals.svg?branch=master)](https://travis-ci.org/knorm/virtuals)
[![coverage status](https://coveralls.io/repos/github/knorm/virtuals/badge.svg?branch=master)](https://coveralls.io/github/knorm/virtuals?branch=master)
[![dependency status](https://david-dm.org/knorm/virtuals.svg)](https://david-dm.org/knorm/virtuals)

Virtuals plugin for [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm).

This plugin adds support for virtual fields.

## Installation

```bash
npm install --save @knorm/knorm @knorm/virtuals
```

> @knorm/virtuals has a peer dependency on
> [@knorm/knorm](https://www.npmjs.com/package/@knorm/knorm)

## Usage

```js
const knorm = require("@knorm/knorm");
const knormVirtuals = require("@knorm/virtuals");

const orm = knorm({
  // knorm options
}).use(
  knormVirtuals({
    // @knorm/virtuals options
  })
);
```

## Options

| Option | Type   | Default    | Description                                                                              |
| ------ | ------ | ---------- | ---------------------------------------------------------------------------------------- |
| `name` | string | `virtuals` | The name of the plugin, allows accessing the plugin instance via Knorm's plugin registry |
