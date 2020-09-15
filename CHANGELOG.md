# Jexl Change Log

This project adheres to [Semantic Versioning](http://semver.org/).

## [development]

Nothing yet!

## [v2.3.0]

### Added

- Top-level expression functions, along with `jexl.addFunction` and
  `jexl.addFunctions`. (#25)
- Binary operators can now be set to evaluate their operands manually, allowing
  them to decide if and when to resolve the value of the left or right sides.
  See the new `manualEval` option in `jexl.addBinaryOp`.
- Support for Latin 1 Suppliment characters in identifiers (#68) (@heharkon)
- Support for Russian chatacters in identifiers (#90) (@a-gorbunov)
- ES5 build for browser support (#87) (@czosel)

### Fixed

- The binary operators `&&` and `||` now evaluate the right operand
  conditionally, depending on the value of the left.

## [v2.2.2]

### Changes

- Jexl now officially supports Node v12. It's been working, but now CI tests it!

### Fixed

- Accessing children of null should resolve to undefined rather than throwing
  (#64)

## [v2.2.1]

### Fixed

- Relative collection filters didn't function appropriately when evalSync was
  used, as it would sometimes revert to using an actual Promise object.
  (#61)

## [v2.2.0]

### Added

- Introducing the `Expression` object, which allows expressions to be compiled
  only once and evaluated many times
- Get an Expression by calling `jexl.createExpression('2 + 2')`
- Get a pre-compiled expression by calling `jexl.compile('2 + 2')`
- Evaluate Expressions asyncronoushly or synchronously by calling
  `myExpression.eval(context)` or `myExpression.evalSync(context)`
- Create expressions using a convenient tagged template: `` jexl.expr`2 + 2` ``

### Fixed

- Transform errors did not always get thrown when using `evalSync` (#55, #56)
  (@bitghostm)
- Arbitrary whitespace is now re-supported (#54) (@czosel)
- Strings were not tokenized correctly when ending with an escaped quote (#51)
  (@rehandalal)
- Identifier names can now start with `$` (#36) (@glromeo)

## [v2.1.1]

### Fixed

- Applying a filter to an undefined identifier now returns an empty array
  instead of an array with one undefined element.

## [v2.1.0]

### Added

- Jexl now has synchronous evaluation! Just call `evalSync`.

## [v2.0.2]

### Fixed

- Issue #47: Revert unintentional change to strict === and !== comparisons

## [v2.0.1]

### Fixed

- Issue where Jexl might mistake an identifier as being relative to a parent
  when it should refer to the top level of the context in one specific case

## [v2.0.0]

### Changed

- The pre-minified Jexl has been removed; in modern times, frontend
  webapps have their own build stack, and Jexl should't make assumptions
  about the module format a frontend app wants to use.
- Support for Node 4 and earlier has been dropped.
- The codebase has been modernized to the subset of ES6 supported in
  Node 6 LTS and beyond. Tests require Node 8 or later.
- The codebase has been shifted to Standard JS style.
- jexl.eval no longer accepts a callback function. Jexl is now promises-only.
- Tests have been converted to Jest to eliminate sneaky error swallowing

## [v1.1.4]

### Fixed

- Falsey identifiers are no longer treated as undefined

## [v1.1.3]

### Fixed

- Binary operators after nested identifiers were not balanced properly,
  resulting in a broken expression/AST
- Gulp (or one of its plugins) had a breaking change in a minor release,
  preventing the frontend build from running. This build method will be
  removed from the next major version of Jexl. For now, Jexl is now version-
  locked to the original gulp+plugins that worked.

## [v1.1.2]

### Changed

- Code coverage thresholds are now enforced through `gulp coverage-test`

### Fixed

- Operators found in identifier names (such as 'in' in 'incident') were being
  tokenized separately from the rest of the identifier

## [v1.1.1]

### Fixed

- Minus did not denote a negative number at the start of a ternary's consequent
  section

## [v1.1.0]

### Added

- The ability to define new binary and unary operators, or override existing
  ones.
- The ability to delete existing binary and unary operators.

## [v1.0.2]

### Fixed

- Bad Gulpfile resulted in frontend dist falling out of sync. Fixed and
  re-synced.

## [v1.0.1]

### Changed

- Refactored Parser and Evaluator. Both operations are now marginally faster.
- Removed balance tracking in favor of passing maps of token types at which
  the sub-parser should stop.

### Fixed

- Object literals could not be defined in the consequent section of a ternary
  expression.

## [v1.0.0]

### Added

- Object literals. Objects can now be defined inline with
  `{standard: 'syntax'}`.
- Array literals. Arrays can also be defined with `["standard", 'syntax']`.
- The 'in' operator, for checking to see if a string appears inside a larger
  string, or if an element exists in an array.
- Ternary expressions with `this ? "standard" : "syntax"`
- Ternary expressions with `alternate ?: "syntax"`

### Changed

- Simplified Grammar, reduced RAM footprint
- Dot notation can now be used to access properties of literals, such as
  `"someString".length` or `{foo: 'bar'}.foo`.
- Transform syntax has changed. Arguments are now passed in parentheses, and
  multiple arguments can be defined. Arguments are no longer limited to object
  literals.

## [v0.2.0]

### Added

- "Divide and floor" operator: //
- Documentation outlining running expressions against XML.

## v0.1.0

### Added

- Initial release

[development]: https://github.com/TomFrost/Jexl/compare/v2.3.0...HEAD
[v2.3.0]: https://github.com/TomFrost/Jexl/compare/v2.2.2...v2.3.0
[v2.2.2]: https://github.com/TomFrost/Jexl/compare/v2.2.1...v2.2.2
[v2.2.1]: https://github.com/TomFrost/Jexl/compare/v2.2.0...v2.2.1
[v2.2.0]: https://github.com/TomFrost/Jexl/compare/v2.1.1...v2.2.0
[v2.1.1]: https://github.com/TomFrost/Jexl/compare/v2.1.0...v2.1.1
[v2.1.0]: https://github.com/TomFrost/Jexl/compare/v2.0.2...v2.1.0
[v2.0.2]: https://github.com/TomFrost/Jexl/compare/v2.0.1...v2.0.2
[v2.0.1]: https://github.com/TomFrost/Jexl/compare/v2.0.0...v2.0.1
[v2.0.0]: https://github.com/TomFrost/Jexl/compare/1.1.4...v2.0.0
[v1.1.4]: https://github.com/TomFrost/Jexl/compare/1.1.3...1.1.4
[v1.1.3]: https://github.com/TomFrost/Jexl/compare/1.1.2...1.1.3
[v1.1.2]: https://github.com/TomFrost/Jexl/compare/1.1.1...1.1.2
[v1.1.1]: https://github.com/TomFrost/Jexl/compare/1.1.0...1.1.1
[v1.1.0]: https://github.com/TomFrost/Jexl/compare/1.0.2...1.1.0
[v1.0.2]: https://github.com/TomFrost/Jexl/compare/1.0.1...1.0.2
[v1.0.1]: https://github.com/TomFrost/Jexl/compare/1.0.0...1.0.1
[v1.0.0]: https://github.com/TomFrost/Jexl/compare/0.2.0...1.0.0
[v0.2.0]: https://github.com/TomFrost/Jexl/compare/0.1.0...0.2.0
