# Jexl Change Log
This project adheres to [Semantic Versioning](http://semver.org/).

## [Development]
### Added
- Object literals. Objects can now be defined inline with
`{standard: 'syntax'}`.

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

[Development]: https://github.com/TechnologyAdvice/Jexl/compare/0.0.2...HEAD
[v0.2.0]: https://github.com/TechnologyAdvice/Jexl/compare/0.1.0...0.2.0
