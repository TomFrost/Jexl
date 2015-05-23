/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var should = require('chai').should(),
	Lexer = require('../../lib/Lexer'),
	Parser = require('../../lib/parser/Parser'),
	grammar = require('../../lib/grammar').elements;

if (!global.Promise)
	global.Promise = require('bluebird').Promise;

var inst,
	lexer = new Lexer(grammar);

function toLine(exp) {
	var lines = lexer.tokenizeLines(exp);
	lines.should.have.length(1);
	return lines[0];
};

describe('Parser', function() {
	beforeEach(function() {
		inst = new Parser(grammar);
	});
	it('should construct an AST for 1+2', function() {
		inst.addTokens(toLine('1+2'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '+',
			left: {type: 'Literal', lineNo: 0, value: 1},
			right: {type: 'Literal', lineNo: 0, value: 2}
		});
	});
	it('should add heavier operations to the right for 2+3*4', function() {
		inst.addTokens(toLine('2+3*4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '+',
			left: {type: 'Literal', lineNo: 0, value: 2},
			right: {
				type: 'BinaryExpression',
				lineNo: 0,
				operator: '*',
				left: {type: 'Literal', lineNo: 0, value: 3},
				right: {type: 'Literal', lineNo: 0, value: 4}
			}
		});
	});
	it('should encapsulate for lighter operation in 2*3+4', function() {
		inst.addTokens(toLine('2*3+4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '+',
			left: {
				type: 'BinaryExpression',
				lineNo: 0,
				operator: '*',
				left: {type: 'Literal', lineNo: 0, value: 2},
				right: {type: 'Literal', lineNo: 0, value: 3}
			},
			right: {type: 'Literal', lineNo: 0, value: 4}
		});
	});
	it('should handle encapsulation of subtree in 2+3*4==5/6-7', function() {
		inst.addTokens(toLine('2+3*4==5/6-7'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '==',
			left: {
				type: 'BinaryExpression',
				lineNo: 0,
				operator: '+',
				left: {type: 'Literal', lineNo: 0, value: 2},
				right: {
					type: 'BinaryExpression',
					lineNo: 0,
					operator: '*',
					left: {type: 'Literal', lineNo: 0, value: 3},
					right: {type: 'Literal', lineNo: 0, value: 4}
				}
			},
			right: {
				type: 'BinaryExpression',
				lineNo: 0,
				operator: '-',
				left: {
					type: 'BinaryExpression',
					lineNo: 0,
					operator: '/',
					left: {type: 'Literal', lineNo: 0, value: 5},
					right: {type: 'Literal', lineNo: 0, value: 6}
				},
				right: {type: 'Literal', lineNo: 0, value: 7}
			}
		});
	});
	it('should handle a unary operator', function() {
		inst.addTokens(toLine('1*!!true-2'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '-',
			left: {
				type: 'BinaryExpression',
				lineNo: 0,
				operator: '*',
				left: {type: 'Literal', lineNo: 0, value: 1},
				right: {
					type: 'UnaryExpression',
					lineNo: 0,
					operator: '!',
					right: {
						type: 'UnaryExpression',
						lineNo: 0,
						operator: '!',
						right: {type: 'Literal', lineNo: 0, value: true}
					}
				}
			},
			right: {type: 'Literal', lineNo: 0, value: 2}
		});
	});
	it('should handle a subexpression', function() {
		inst.addTokens(toLine('(2+3)*4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '*',
			left: {
				type: 'BinaryExpression',
				lineNo: 0,
				operator: '+',
				left: {type: 'Literal', lineNo: 0, value: 2},
				right: {type: 'Literal', lineNo: 0, value: 3}
			},
			right: {type: 'Literal', lineNo: 0, value: 4}
		});
	});
	it('should handle nested subexpressions', function() {
		inst.addTokens(toLine('(4*(2+3))/5'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '/',
			left: {
				type: 'BinaryExpression',
				lineNo: 0,
				operator: '*',
				left: {type: 'Literal', lineNo: 0, value: 4},
				right: {
					type: 'BinaryExpression',
					lineNo: 0,
					operator: '+',
					left: {type: 'Literal', lineNo: 0, value: 2},
					right: {type: 'Literal', lineNo: 0, value: 3}
				}
			},
			right: {type: 'Literal', lineNo: 0, value: 5}
		});
	});
	it('should handle object literals', function() {
		inst.addTokens(toLine('{foo: "bar", tek: 1+2}'));
		inst.complete().should.deep.equal({
			type: 'ObjectLiteral',
			value: {
				foo: {type: 'Literal', lineNo: 0, value: 'bar'},
				tek: {
					type: 'BinaryExpression',
					lineNo: 0,
					operator: '+',
					left: {type: 'Literal', lineNo: 0, value: 1},
					right: {type: 'Literal', lineNo: 0, value: 2}
				}
			}
		});
	});
	it('should handle nested object literals', function() {
		inst.addTokens(toLine('{foo: {bar: "tek"}}'));
		inst.complete().should.deep.equal({
			type: 'ObjectLiteral',
			value: {
				foo: {
					type: 'ObjectLiteral',
					value: {
						bar: {type: 'Literal', lineNo: 0, value: 'tek'}
					}
				}
			}
		});
	});
	it('should handle empty object literals', function() {
		inst.addTokens(toLine('{}'));
		inst.complete().should.deep.equal({
			type: 'ObjectLiteral',
			value: {}
		});
	});
	it('should handle array literals', function() {
		inst.addTokens(toLine('["foo", 1+2]'));
		inst.complete().should.deep.equal({
			type: 'ArrayLiteral',
			value: [
				{type: 'Literal', lineNo: 0, value: 'foo'},
				{
					type: 'BinaryExpression',
					lineNo: 0,
					operator: '+',
					left: {type: 'Literal', lineNo: 0, value: 1},
					right: {type: 'Literal', lineNo: 0, value: 2}
				}
			]
		});
	});
	it('should handle nested array literals', function() {
		inst.addTokens(toLine('["foo", ["bar", "tek"]]'));
		inst.complete().should.deep.equal({
			type: 'ArrayLiteral',
			value: [
				{type: 'Literal', lineNo: 0, value: 'foo'},
				{
					type: 'ArrayLiteral',
					value: [
						{type: 'Literal', lineNo: 0, value: 'bar'},
						{type: 'Literal', lineNo: 0, value: 'tek'}
					]
				}
			]
		});
	});
	it('should handle empty array literals', function() {
		inst.addTokens(toLine('[]'));
		inst.complete().should.deep.equal({
			type: 'ArrayLiteral',
			value: []
		});
	});
	it('should chain traversed identifiers', function() {
		inst.addTokens(toLine('foo.bar.baz + 1'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '+',
			left: {
				type: 'Identifier',
				lineNo: 0,
				value: 'baz',
				from: {
					type: 'Identifier',
					lineNo: 0,
					value: 'bar',
					from: {
						type: 'Identifier',
						lineNo: 0,
						value: 'foo'
					}
				}
			},
			right: {type: 'Literal', lineNo: 0, value: 1}
		});
	});
	it('should apply transforms and arguments', function() {
		inst.addTokens(toLine('foo|tr1|tr2.baz|tr3({bar:"tek"})'));
		inst.complete().should.deep.equal({
			type: 'Transform',
			lineNo: 0,
			name: 'tr3',
			args: [{
				type: 'ObjectLiteral',
				value: {
					bar: {type: 'Literal', lineNo: 0, value: 'tek'}
				}
			}],
			subject: {
				type: 'Identifier',
				lineNo: 0,
				value: 'baz',
				from: {
					type: 'Transform',
					lineNo: 0,
					name: 'tr2',
					args: [],
					subject: {
						type: 'Transform',
						lineNo: 0,
						name: 'tr1',
						args: [],
						subject: {
							type: 'Identifier',
							lineNo: 0,
							value: 'foo'
						}
					}
				}
			}
		});
	});
	it('should handle multiple arguments in transforms', function() {
		inst.addTokens(toLine('foo|bar("tek", 5, true)'));
		inst.complete().should.deep.equal({
			type: 'Transform',
			lineNo: 0,
			name: 'bar',
			args: [
				{type: 'Literal', lineNo: 0, value: 'tek'},
				{type: 'Literal', lineNo: 0, value: 5},
				{type: 'Literal', lineNo: 0, value: true}
			],
			subject: {type: 'Identifier',
			lineNo: 0, lineNo: 0, value: 'foo'}
		});
	});
	it('should apply filters to identifiers', function() {
		inst.addTokens(toLine('foo[1][.bar[0]=="tek"].baz'));
		inst.complete().should.deep.equal({
			type: 'Identifier',
			lineNo: 0,
			value: 'baz',
			from: {
				type: 'FilterExpression',
				relative: true,
				expr: {
					type: 'BinaryExpression',
					lineNo: 0,
					operator: '==',
					left: {
						type: 'FilterExpression',
						relative: false,
						expr: {type: 'Literal', lineNo: 0, value: 0},
						subject: {
							type: 'Identifier',
							lineNo: 0,
							value: 'bar',
							relative: true
						}
					},
					right: {type: 'Literal', lineNo: 0, value: 'tek'}
				},
				subject: {
					type: 'FilterExpression',
					relative: false,
					expr: {type: 'Literal', lineNo: 0, value: 1},
					subject: {type: 'Identifier',
					lineNo: 0, lineNo: 0, value: 'foo'}
				}
			}
		});
	});
	it('should allow dot notation for all operands', function() {
		inst.addTokens(toLine('"foo".length + {foo: "bar"}.foo'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '+',
			left: {
				type: 'Identifier',
				lineNo: 0,
				value: 'length',
				from: {type: 'Literal', lineNo: 0, value: 'foo'}
			},
			right: {
				type: 'Identifier',
				lineNo: 0,
				value: 'foo',
				from: {
					type: 'ObjectLiteral',
					value: {
						foo: {type: 'Literal', lineNo: 0, value: 'bar'}
					}
				}
			}
		});
	});
	it('should allow dot notation on subexpressions', function() {
		inst.addTokens(toLine('("foo" + "bar").length'));
		inst.complete().should.deep.equal({
			type: 'Identifier',
			lineNo: 0,
			value: 'length',
			from: {
				type: 'BinaryExpression',
				lineNo: 0,
				operator: '+',
				left: {type: 'Literal', lineNo: 0, value: 'foo'},
				right: {type: 'Literal', lineNo: 0, value: 'bar'}
			}
		});
	});
	it('should allow dot notation on arrays', function() {
		inst.addTokens(toLine('["foo", "bar"].length'));
		inst.complete().should.deep.equal({
			type: 'Identifier',
			lineNo: 0,
			value: 'length',
			from: {
				type: 'ArrayLiteral',
				value: [
					{type: 'Literal', lineNo: 0, value: 'foo'},
					{type: 'Literal', lineNo: 0, value: 'bar'}
				]
			}
		});
	});
	it('should handle a ternary expression', function() {
		inst.addTokens(toLine('foo ? 1 : 0'));
		inst.complete().should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier',
			lineNo: 0, lineNo: 0, value: 'foo'},
			consequent: {type: 'Literal', lineNo: 0, value: 1},
			alternate: {type: 'Literal', lineNo: 0, value: 0}
		});
	});
	it('should handle nested and grouped ternary expressions', function() {
		inst.addTokens(toLine('foo ? (bar ? 1 : 2) : 3'));
		inst.complete().should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier',
			lineNo: 0, lineNo: 0, value: 'foo'},
			consequent: {
				type: 'ConditionalExpression',
				test: {type: 'Identifier',
				lineNo: 0, lineNo: 0, value: 'bar'},
				consequent: {type: 'Literal', lineNo: 0, value: 1},
				alternate: {type: 'Literal', lineNo: 0, value: 2}
			},
			alternate: {type: 'Literal', lineNo: 0, value: 3}
		});
	});
	it('should handle nested, non-grouped ternary expressions', function() {
		inst.addTokens(toLine('foo ? bar ? 1 : 2 : 3'));
		inst.complete().should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier',
			lineNo: 0, lineNo: 0, value: 'foo'},
			consequent: {
				type: 'ConditionalExpression',
				test: {type: 'Identifier',
				lineNo: 0, lineNo: 0, value: 'bar'},
				consequent: {type: 'Literal', lineNo: 0, value: 1},
				alternate: {type: 'Literal', lineNo: 0, value: 2}
			},
			alternate: {type: 'Literal', lineNo: 0, value: 3}
		});
	});
	it('should handle ternary expression with objects', function() {
		inst.addTokens(toLine('foo ? {bar: "tek"} : "baz"'));
		inst.complete().should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier',
			lineNo: 0, lineNo: 0, value: 'foo'},
			consequent: {
				type: 'ObjectLiteral',
				value: {
					bar: {type: 'Literal', lineNo: 0, value: 'tek'}
				}
			},
			alternate: {type: 'Literal', lineNo: 0, value: 'baz'}
		});
	});
});
