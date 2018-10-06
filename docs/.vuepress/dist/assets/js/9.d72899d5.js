(window.webpackJsonp=window.webpackJsonp||[]).push([[9],{171:function(t,e,s){"use strict";s.r(e);var a=s(0),n=Object(a.a)({},function(){var t=this,e=t.$createElement,s=t._self._c||e;return s("div",{staticClass:"content"},[t._m(0),t._v(" "),s("p",[t._v("Debug mode turns on features that help with debugging but at a cost to\nperformance or even security in some cases.")]),t._v(" "),t._m(1),t._v(" "),s("p",[t._v("It can be enabled globally via the "),s("code",[t._v("debug")]),t._v(" option to the\n"),s("router-link",{attrs:{to:"/api.html#new-knorm-config"}},[t._v("Knorm")]),t._v(" or for a single "),s("router-link",{attrs:{to:"/api.html#Query"}},[t._v("Query")]),t._v("\ninstance via the "),s("router-link",{attrs:{to:"/api.html#query-debug-debug-⇒-query"}},[t._v("debug")]),t._v(" query option.")],1),t._v(" "),t._m(2),s("p",[t._v("When turned on, debug mode enables these features:")]),t._v(" "),t._m(3),t._v(" "),s("p",[t._v("To work around "),s("a",{attrs:{href:"https://github.com/nodejs/node/issues/11865",target:"_blank",rel:"noopener noreferrer"}},[t._v("this Node.js async/await\nissue"),s("OutboundLink")],1),t._v(", Knorm updates the "),s("code",[t._v("stack")]),t._v("\nproperty of "),s("router-link",{attrs:{to:"/api.html#QueryError"}},[t._v("QueryError")]),t._v(" instances to include the first line\nof the method's invocation.")],1),t._v(" "),t._m(4),t._v(" "),s("table",[t._m(5),t._v(" "),s("tbody",[s("tr",[s("td",[s("router-link",{attrs:{to:"/api.html#query-insert-data-options-⇒-promise"}},[t._v("query.insert")])],1),t._v(" "),s("td",[s("router-link",{attrs:{to:"/api.html#query-inserterror-inserterror"}},[t._v("InsertError")])],1)]),t._v(" "),s("tr",[s("td",[s("router-link",{attrs:{to:"/api.html#query-update-data-options-⇒-promise"}},[t._v("query.update")])],1),t._v(" "),s("td",[s("router-link",{attrs:{to:"/api.html#query-updateerror-inserterror"}},[t._v("UpdateError")])],1)]),t._v(" "),s("tr",[s("td",[s("router-link",{attrs:{to:"/api.html#query-delete-data-options-⇒-promise"}},[t._v("query.delete")])],1),t._v(" "),s("td",[s("router-link",{attrs:{to:"/api.html#query-deleteerror-inserterror"}},[t._v("DeleteError")])],1)]),t._v(" "),s("tr",[s("td",[s("router-link",{attrs:{to:"/api.html#query-fetch-data-options-⇒-promise"}},[t._v("query.fetch")])],1),t._v(" "),s("td",[s("router-link",{attrs:{to:"/api.html#query-fetcherror-inserterror"}},[t._v("FetchError")])],1)]),t._v(" "),s("tr",[s("td",[s("router-link",{attrs:{to:"/api.html#query-count-data-options-⇒-promise"}},[t._v("query.count")])],1),t._v(" "),s("td",[s("router-link",{attrs:{to:"/api.html#query-counterror-inserterror"}},[t._v("CountError")])],1)])])]),t._v(" "),t._m(6),t._v(" "),t._m(7),t._v(" "),s("p",[t._v("For example:")]),t._v(" "),t._m(8),s("p",[t._v("This presents a security risk: leaking user data. In production, where there's\nlikely an error-logging mechanism enabled, this error would probably be picked\nup the logging mechanism and persisted somewhere. Whether it ends up on a log\nfile or is sent to some log-collection service, the user's information would\nbe made available in an environment that probably doesn't have the same security\npolicies as the database storing user data.")])])},[function(){var t=this.$createElement,e=this._self._c||t;return e("h1",{attrs:{id:"debugging"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#debugging","aria-hidden":"true"}},[this._v("#")]),this._v(" Debugging")])},function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"warning custom-block"},[e("p",{staticClass:"custom-block-title"},[this._v("WARNING")]),this._v(" "),e("p",[this._v("Debug mode is not meant to be used in production. Read on for reasons why.")])])},function(){var t=this,e=t.$createElement,s=t._self._c||e;return s("div",{staticClass:"language-js extra-class"},[s("pre",{pre:!0,attrs:{class:"language-js"}},[s("code",[s("span",{attrs:{class:"token comment"}},[t._v("// To enalbe globally:")]),t._v("\n"),s("span",{attrs:{class:"token keyword"}},[t._v("const")]),t._v(" knorm "),s("span",{attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),s("span",{attrs:{class:"token function"}},[t._v("require")]),s("span",{attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{attrs:{class:"token string"}},[t._v("'@knorm/knorm'")]),s("span",{attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n"),s("span",{attrs:{class:"token keyword"}},[t._v("const")]),t._v(" "),s("span",{attrs:{class:"token punctuation"}},[t._v("{")]),t._v(" Model "),s("span",{attrs:{class:"token punctuation"}},[t._v("}")]),t._v(" "),s("span",{attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),s("span",{attrs:{class:"token function"}},[t._v("knorm")]),s("span",{attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  debug"),s("span",{attrs:{class:"token punctuation"}},[t._v(":")]),t._v(" "),s("span",{attrs:{class:"token boolean"}},[t._v("true")]),t._v("\n"),s("span",{attrs:{class:"token punctuation"}},[t._v("}")]),s("span",{attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n"),s("span",{attrs:{class:"token comment"}},[t._v("// For a single Query instance:")]),t._v("\nModel"),s("span",{attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{attrs:{class:"token function"}},[t._v("fetch")]),s("span",{attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  debug"),s("span",{attrs:{class:"token punctuation"}},[t._v(":")]),t._v(" "),s("span",{attrs:{class:"token boolean"}},[t._v("true")]),t._v("\n"),s("span",{attrs:{class:"token punctuation"}},[t._v("}")]),s("span",{attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])])},function(){var t=this.$createElement,e=this._self._c||t;return e("h2",{attrs:{id:"better-stack-traces"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#better-stack-traces","aria-hidden":"true"}},[this._v("#")]),this._v(" Better stack traces")])},function(){var t=this.$createElement,e=this._self._c||t;return e("p",[this._v("This is done only for database operations (insert, update, delete, fetch and\ncount) and involves creating an "),e("code",[this._v("Error")]),this._v(" instance at the start of each of these\noperations to capture the stack trace and then updating the query error  later\non, if one occurs. Having to create this placeholder "),e("code",[this._v("Error")]),this._v(" instance has a\nnegative impact on the performance of the database operation.")])},function(){var t=this.$createElement,e=this._self._c||t;return e("thead",[e("tr",[e("th",[this._v("Operation")]),this._v(" "),e("th",[this._v("Error updated")])])])},function(){var t=this.$createElement,e=this._self._c||t;return e("h2",{attrs:{id:"sql-values-in-database-errors"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#sql-values-in-database-errors","aria-hidden":"true"}},[this._v("#")]),this._v(" SQL values in database errors")])},function(){var t=this,e=t.$createElement,s=t._self._c||e;return s("p",[t._v("When queries fail, Knorm attaches an "),s("code",[t._v("sql")]),t._v(" property to the error with the\n"),s("strong",[t._v("parameterized")]),t._v(" SQL that caused the failure. With debugging enabled, it\ninstead attaches the "),s("strong",[t._v("stringified")]),t._v(" version of the "),s("code",[t._v("sql")]),t._v(" which contains values\ninstead of placeholders for the values.")])},function(){var t=this,e=t.$createElement,s=t._self._c||e;return s("div",{staticClass:"language-js extra-class"},[s("pre",{pre:!0,attrs:{class:"language-js"}},[s("code",[t._v("Model\n  "),s("span",{attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{attrs:{class:"token function"}},[t._v("insert")]),s("span",{attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{attrs:{class:"token punctuation"}},[t._v("{")]),t._v(" username"),s("span",{attrs:{class:"token punctuation"}},[t._v(":")]),t._v(" "),s("span",{attrs:{class:"token string"}},[t._v("'foo'")]),s("span",{attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" password"),s("span",{attrs:{class:"token punctuation"}},[t._v(":")]),t._v(" "),s("span",{attrs:{class:"token string"}},[t._v("'bar'")]),t._v(" "),s("span",{attrs:{class:"token punctuation"}},[t._v("}")]),s("span",{attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n  "),s("span",{attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{attrs:{class:"token keyword"}},[t._v("catch")]),s("span",{attrs:{class:"token punctuation"}},[t._v("(")]),t._v("e "),s("span",{attrs:{class:"token operator"}},[t._v("=>")]),t._v(" "),s("span",{attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    console"),s("span",{attrs:{class:"token punctuation"}},[t._v(".")]),s("span",{attrs:{class:"token function"}},[t._v("log")]),s("span",{attrs:{class:"token punctuation"}},[t._v("(")]),t._v("e"),s("span",{attrs:{class:"token punctuation"}},[t._v(".")]),t._v("sql"),s("span",{attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n    "),s("span",{attrs:{class:"token comment"}},[t._v("// normally, e.sql would be something like:")]),t._v("\n    "),s("span",{attrs:{class:"token comment"}},[t._v('// `INSERT INTO "user" ("username", "password") VALUES ($1, $2)`')]),t._v("\n    "),s("span",{attrs:{class:"token comment"}},[t._v("// with debug mode enabled, it would be something like:")]),t._v("\n    "),s("span",{attrs:{class:"token comment"}},[t._v('// `INSERT INTO "user" ("username", "password") VALUES (\'foo\', \'bar\')`')]),t._v("\n  "),s("span",{attrs:{class:"token punctuation"}},[t._v("}")]),s("span",{attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])])}],!1,null,null,null);n.options.__file="debugging.md";e.default=n.exports}}]);