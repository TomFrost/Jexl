/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var should = require('chai').should(),
	Lexer = require('../../lib/Lexer'),
	Parser = require('../../lib/parser/Parser'),
	grammar = require('../../lib/grammar').elements;

var inst,
	lexer = new Lexer(grammar);

describe('Parser', function() {
	beforeEach(function() {
		inst = new Parser(grammar);
	});
	it('should construct an AST for 1+2', function() {
		inst.addTokens(lexer.tokenize('1+2'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '+',
			left: {type: 'Literal', value: 1},
			right: {type: 'Literal', value: 2}
		});
	});
	it('should add heavier operations to the right for 2+3*4', function() {
		inst.addTokens(lexer.tokenize('2+3*4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '+',
			left: {type: 'Literal', value: 2},
			right: {
				type: 'BinaryExpression',
				operator: '*',
				left: {type: 'Literal', value: 3},
				right: {type: 'Literal', value: 4}
			}
		});
	});
	it('should encapsulate for lighter operation in 2*3+4', function() {
		inst.addTokens(lexer.tokenize('2*3+4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '+',
			left: {
				type: 'BinaryExpression',
				operator: '*',
				left: {type: 'Literal', value: 2},
				right: {type: 'Literal', value: 3}
			},
			right: {type: 'Literal', value: 4}
		});
	});
	it('should handle encapsulation of subtree in 2+3*4==5/6-7', function() {
		inst.addTokens(lexer.tokenize('2+3*4==5/6-7'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '==',
			left: {
				type: 'BinaryExpression',
				operator: '+',
				left: {type: 'Literal', value: 2},
				right: {
					type: 'BinaryExpression',
					operator: '*',
					left: {type: 'Literal', value: 3},
					right: {type: 'Literal', value: 4}
				}
			},
			right: {
				type: 'BinaryExpression',
				operator: '-',
				left: {
					type: 'BinaryExpression',
					operator: '/',
					left: {type: 'Literal', value: 5},
					right: {type: 'Literal', value: 6}
				},
				right: {type: 'Literal', value: 7}
			}
		});
	});
	it('should handle a unary operator', function() {
		inst.addTokens(lexer.tokenize('1*!!true-2'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '-',
			left: {
				type: 'BinaryExpression',
				operator: '*',
				left: {type: 'Literal', value: 1},
				right: {
					type: 'UnaryExpression',
					operator: '!',
					right: {
						type: 'UnaryExpression',
						operator: '!',
						right: {type: 'Literal', value: true}
					}
				}
			},
			right: {type: 'Literal', value: 2}
		});
	});
	it('should handle a subexpression', function() {
		inst.addTokens(lexer.tokenize('(2+3)*4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '*',
			left: {
				type: 'BinaryExpression',
				operator: '+',
				left: {type: 'Literal', value: 2},
				right: {type: 'Literal', value: 3}
			},
			right: {type: 'Literal', value: 4}
		});
	});
	it('should handle nested subexpressions', function() {
		inst.addTokens(lexer.tokenize('(4*(2+3))/5'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '/',
			left: {
				type: 'BinaryExpression',
				operator: '*',
				left: {type: 'Literal', value: 4},
				right: {
					type: 'BinaryExpression',
					operator: '+',
					left: {type: 'Literal', value: 2},
					right: {type: 'Literal', value: 3}
				}
			},
			right: {type: 'Literal', value: 5}
		});
	});
	it('should handle object literals', function() {
		inst.addTokens(lexer.tokenize('{foo: "bar", tek: 1+2}'));
		inst.complete().should.deep.equal({
			type: 'ObjectLiteral',
			value: {
				foo: {type: 'Literal', value: 'bar'},
				tek: {
					type: 'BinaryExpression',
					operator: '+',
					left: {type: 'Literal', value: 1},
					right: {type: 'Literal', value: 2}
				}
			}
		});
	});
	it('should handle nested object literals', function() {
		inst.addTokens(lexer.tokenize('{foo: {bar: "tek"}}'));
		inst.complete().should.deep.equal({
			type: 'ObjectLiteral',
			value: {
				foo: {
					type: 'ObjectLiteral',
					value: {
						bar: {type: 'Literal', value: 'tek'}
					}
				}
			}
		});
	});
	it('should handle empty object literals', function() {
		inst.addTokens(lexer.tokenize('{}'));
		inst.complete().should.deep.equal({
			type: 'ObjectLiteral',
			value: {}
		});
	});
	it('should handle array literals', function() {
		inst.addTokens(lexer.tokenize('["foo", 1+2]'));
		inst.complete().should.deep.equal({
			type: 'ArrayLiteral',
			value: [
				{type: 'Literal', value: 'foo'},
				{
					type: 'BinaryExpression',
					operator: '+',
					left: {type: 'Literal', value: 1},
					right: {type: 'Literal', value: 2}
				}
			]
		});
	});
	it('should handle nested array literals', function() {
		inst.addTokens(lexer.tokenize('["foo", ["bar", "tek"]]'));
		inst.complete().should.deep.equal({
			type: 'ArrayLiteral',
			value: [
				{type: 'Literal', value: 'foo'},
				{
					type: 'ArrayLiteral',
					value: [
						{type: 'Literal', value: 'bar'},
						{type: 'Literal', value: 'tek'}
					]
				}
			]
		});
	});
	it('should handle empty array literals', function() {
		inst.addTokens(lexer.tokenize('[]'));
		inst.complete().should.deep.equal({
			type: 'ArrayLiteral',
			value: []
		});
	});
	it('should chain traversed identifiers', function() {
		inst.addTokens(lexer.tokenize('foo.bar.baz + 1'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '+',
			left: {
				type: 'Identifier',
				value: 'baz',
				from: {
					type: 'Identifier',
					value: 'bar',
					from: {
						type: 'Identifier',
						value: 'foo'
					}
				}
			},
			right: {type: 'Literal', value: 1}
		});
	});
	it('should apply transforms and arguments', function() {
		inst.addTokens(lexer.tokenize('foo|tr1|tr2.baz|tr3({bar:"tek"})'));
		inst.complete().should.deep.equal({
			type: 'Transform',
			name: 'tr3',
			args: [{
				type: 'ObjectLiteral',
				value: {
					bar: {type: 'Literal', value: 'tek'}
				}
			}],
			subject: {
				type: 'Identifier',
				value: 'baz',
				from: {
					type: 'Transform',
					name: 'tr2',
					args: [],
					subject: {
						type: 'Transform',
						name: 'tr1',
						args: [],
						subject: {
							type: 'Identifier',
							value: 'foo'
						}
					}
				}
			}
		});
	});
	it('should handle multiple arguments in transforms', function() {
		inst.addTokens(lexer.tokenize('foo|bar("tek", 5, true)'));
		inst.complete().should.deep.equal({
			type: 'Transform',
			name: 'bar',
			args: [
				{type: 'Literal', value: 'tek'},
				{type: 'Literal', value: 5},
				{type: 'Literal', value: true}
			],
			subject: {type: 'Identifier', value: 'foo'}
		});
	});
	it('should apply filters to identifiers', function() {
		inst.addTokens(lexer.tokenize('foo[1][.bar[0]=="tek"].baz'));
		inst.complete().should.deep.equal({
			type: 'Identifier',
			value: 'baz',
			from: {
				type: 'FilterExpression',
				relative: true,
				expr: {
					type: 'BinaryExpression',
					operator: '==',
					left: {
						type: 'FilterExpression',
						relative: false,
						expr: {type: 'Literal', value: 0},
						subject: {
							type: 'Identifier',
							value: 'bar',
							relative: true
						}
					},
					right: {type: 'Literal', value: 'tek'}
				},
				subject: {
					type: 'FilterExpression',
					relative: false,
					expr: {type: 'Literal', value: 1},
					subject: {type: 'Identifier', value: 'foo'}
				}
			}
		});
	});
	it('should allow dot notation for all operands', function() {
		inst.addTokens(lexer.tokenize('"foo".length + {foo: "bar"}.foo'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: '+',
			left: {
				type: 'Identifier',
				value: 'length',
				from: {type: 'Literal', value: 'foo'}
			},
			right: {
				type: 'Identifier',
				value: 'foo',
				from: {
					type: 'ObjectLiteral',
					value: {
						foo: {type: 'Literal', value: 'bar'}
					}
				}
			}
		});
	});
	it('should allow dot notation on subexpressions', function() {
		inst.addTokens(lexer.tokenize('("foo" + "bar").length'));
		inst.complete().should.deep.equal({
			type: 'Identifier',
			value: 'length',
			from: {
				type: 'BinaryExpression',
				operator: '+',
				left: {type: 'Literal', value: 'foo'},
				right: {type: 'Literal', value: 'bar'}
			}
		});
	});
	it('should allow dot notation on arrays', function() {
		inst.addTokens(lexer.tokenize('["foo", "bar"].length'));
		inst.complete().should.deep.equal({
			type: 'Identifier',
			value: 'length',
			from: {
				type: 'ArrayLiteral',
				value: [
					{type: 'Literal', value: 'foo'},
					{type: 'Literal', value: 'bar'}
				]
			}
		});
	});
	it('should handle a ternary expression', function() {
		inst.addTokens(lexer.tokenize('foo ? 1 : 0'));
		inst.complete().should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier', value: 'foo'},
			consequent: {type: 'Literal', value: 1},
			alternate: {type: 'Literal', value: 0}
		});
	});
	it('should handle nested and grouped ternary expressions', function() {
		inst.addTokens(lexer.tokenize('foo ? (bar ? 1 : 2) : 3'));
		inst.complete().should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier', value: 'foo'},
			consequent: {
				type: 'ConditionalExpression',
				test: {type: 'Identifier', value: 'bar'},
				consequent: {type: 'Literal', value: 1},
				alternate: {type: 'Literal', value: 2}
			},
			alternate: {type: 'Literal', value: 3}
		});
	});
	it('should handle nested, non-grouped ternary expressions', function() {
		inst.addTokens(lexer.tokenize('foo ? bar ? 1 : 2 : 3'));
		inst.complete().should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier', value: 'foo'},
			consequent: {
				type: 'ConditionalExpression',
				test: {type: 'Identifier', value: 'bar'},
				consequent: {type: 'Literal', value: 1},
				alternate: {type: 'Literal', value: 2}
			},
			alternate: {type: 'Literal', value: 3}
		});
	});
	it('should handle ternary expression with objects', function() {
		inst.addTokens(lexer.tokenize('foo ? {bar: "tek"} : "baz"'));
		inst.complete().should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier', value: 'foo'},
			consequent: {
				type: 'ObjectLiteral',
				value: {
					bar: {type: 'Literal', value: 'tek'}
				}
			},
			alternate: {type: 'Literal', value: 'baz'}
		});
	});
});
