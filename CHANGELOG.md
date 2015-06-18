# Jexl Change Log
This project adheres to [Semantic Versioning](http://semver.org/).

## Development (2.x branch)
### Added
- Karma testing, to make sure everything works in both Node and Firefox
- UMD wrapper for Jexl frontend. No more direct calls to a pre-packaged require
function!

### Changed
- Some basic linting is now enforced. It does not currently match the code
standards as advertised on https://github.com/TechnologyAdvice/javascript due
to Jexl being written before those standards were adopted, but it's a start.
- Building and testing is now handled by NPM scripts for simplicity and
performance

### Removed
- Gulp build and test processes

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

## [v1.0.2] = 2015-03-08
### Fixed
- Bad Gulpfile resulted in frontend dist falling out of sync. Fixed and
re-synced.

## [v1.0.1] - 2015-03-08
### Changed
- Refactored Parser and Evaluator. Both operations are now marginally faster.
- Removed balance tracking in favor of passing maps of token types at which
the sub-parser should stop.

### Fixed
- Object literals could not be defined in the consequent section of a ternary
expression.

## [v1.0.0] - 2015-03-04
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

## [v0.2.0] - 2015-03-02
### Added
- "Divide and floor" operator: //
- Documentation outlining running expressions against XML.

## v0.1.0 - 2015-03-02
### Added
- Initial release

[Development]: https://github.com/TechnologyAdvice/Jexl/compare/1.1.2...HEAD
[v1.1.2]: https://github.com/TechnologyAdvice/Jexl/compare/1.1.1...1.1.2
[v1.1.1]: https://github.com/TechnologyAdvice/Jexl/compare/1.1.0...1.1.1
[v1.1.0]: https://github.com/TechnologyAdvice/Jexl/compare/1.0.2...1.1.0
[v1.0.2]: https://github.com/TechnologyAdvice/Jexl/compare/1.0.1...1.0.2
[v1.0.1]: https://github.com/TechnologyAdvice/Jexl/compare/1.0.0...1.0.1
[v1.0.0]: https://github.com/TechnologyAdvice/Jexl/compare/0.2.0...1.0.0
[v0.2.0]: https://github.com/TechnologyAdvice/Jexl/compare/0.1.0...0.2.0
