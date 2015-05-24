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
	completeParse,
	lexer = new Lexer(grammar);

function toLine(exp) {
	var lines = lexer.tokenizeLines(exp);
	lines.should.have.length(1);
	return lines[0];
};

describe('Parser', function() {
	beforeEach(function() {
		inst = new Parser(grammar);
		completeParse = function(exp) {
			inst.addTokens(toLine(exp));
			return inst.complete();
		};
	});
	it('should construct an AST for 1+2', function() {
		completeParse('1+2').should.deep.equal({
			type: 'BinaryExpression',
			lineNo: 0,
			operator: '+',
			left: {type: 'Literal', lineNo: 0, value: 1},
			right: {type: 'Literal', lineNo: 0, value: 2}
		});
	});
	it('should add heavier operations to the right for 2+3*4', function() {
		completeParse('2+3*4').should.deep.equal({
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
		completeParse('2*3+4').should.deep.equal({
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
		completeParse('2+3*4==5/6-7').should.deep.equal({
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
		completeParse('1*!!true-2').should.deep.equal({
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
		completeParse('(2+3)*4').should.deep.equal({
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
		completeParse('(4*(2+3))/5').should.deep.equal({
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
		completeParse('{foo: "bar", tek: 1+2}').should.deep.equal({
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
		completeParse('{foo: {bar: "tek"}}').should.deep.equal({
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
		completeParse('{}').should.deep.equal({
			type: 'ObjectLiteral',
			value: {}
		});
	});
	it('should handle array literals', function() {
		completeParse('["foo", 1+2]').should.deep.equal({
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
		completeParse('["foo", ["bar", "tek"]]').should.deep.equal({
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
		completeParse('[]').should.deep.equal({
			type: 'ArrayLiteral',
			value: []
		});
	});
	it('should chain traversed identifiers', function() {
		completeParse('foo.bar.baz + 1').should.deep.equal({
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
		completeParse('foo|tr1|tr2.baz|tr3({bar:"tek"})').should.deep.equal({
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
		completeParse('foo|bar("tek", 5, true)').should.deep.equal({
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
		completeParse('foo[1][.bar[0]=="tek"].baz').should.deep.equal({
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
		completeParse('"foo".length + {foo: "bar"}.foo').should.deep.equal({
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
		completeParse('("foo" + "bar").length').should.deep.equal({
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
		completeParse('["foo", "bar"].length').should.deep.equal({
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
		completeParse('foo ? 1 : 0').should.deep.equal({
			type: 'ConditionalExpression',
			test: {type: 'Identifier',
			lineNo: 0, lineNo: 0, value: 'foo'},
			consequent: {type: 'Literal', lineNo: 0, value: 1},
			alternate: {type: 'Literal', lineNo: 0, value: 0}
		});
	});
	it('should handle nested and grouped ternary expressions', function() {
		completeParse('foo ? (bar ? 1 : 2) : 3').should.deep.equal({
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
		completeParse('foo ? bar ? 1 : 2 : 3').should.deep.equal({
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
		completeParse('foo ? {bar: "tek"} : "baz"').should.deep.equal({
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
	it('should throw when an expression ends unexpectedly', function() {
		return completeParse.bind(null, "5+").should.throw();
	});
	it('should throw when an expression has bare identifiers', function() {
		return completeParse.bind(null, "foo garf").should.throw();
	});
	it('should throw when literals are used as variables in a lambda expression', function() {
		return completeParse.bind(null, "foo | map((5) -> 5 + 2)").should.throw();
	});
	it('should throw when adding tokens to a completed parser', function() {
		var extraToken = toLine("foo")[0];
		completeParse("5 + 5");
		return inst.addToken.bind(inst, extraToken).should.throw()
	});
	it('should throw when an expression has bare identifiers separated by commas', function() {
		return completeParse.bind(null, '(((x, y)))').should.throw();
	});
});
