/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var should = require('chai').should(),
	Lexer = require('../lib/Lexer');
	Parser = require('../lib/Parser');

var inst;

describe('Parser', function() {
	beforeEach(function() {
		inst = new Parser();
	});
	it('should construct an AST for 1+2', function() {
		inst.addTokens(Lexer.tokenize('1+2'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: 'binOpAddConcat',
			left: {type: 'Literal', value: 1},
			right: {type: 'Literal', value: 2}
		});
	});
	it('should add heavier operations to the right for 2+3*4', function() {
		inst.addTokens(Lexer.tokenize('2+3*4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: 'binOpAddConcat',
			left: {type: 'Literal', value: 2},
			right: {
				type: 'BinaryExpression',
				operator: 'binOpMult',
				left: {type: 'Literal', value: 3},
				right: {type: 'Literal', value: 4}
			}
		});
	});
	it('should encapsulate for lighter operation in 2*3+4', function() {
		inst.addTokens(Lexer.tokenize('2*3+4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: 'binOpAddConcat',
			left: {
				type: 'BinaryExpression',
				operator: 'binOpMult',
				left: {type: 'Literal', value: 2},
				right: {type: 'Literal', value: 3}
			},
			right: {type: 'Literal', value: 4}
		});
	});
	it('should handle encapsulation of subtree in 2+3*4==5/6-7', function() {
		inst.addTokens(Lexer.tokenize('2+3*4==5/6-7'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: 'binOpCmpEq',
			left: {
				type: 'BinaryExpression',
				operator: 'binOpAddConcat',
				left: {type: 'Literal', value: 2},
				right: {
					type: 'BinaryExpression',
					operator: 'binOpMult',
					left: {type: 'Literal', value: 3},
					right: {type: 'Literal', value: 4}
				}
			},
			right: {
				type: 'BinaryExpression',
				operator: 'binOpSub',
				left: {
					type: 'BinaryExpression',
					operator: 'binOpDiv',
					left: {type: 'Literal', value: 5},
					right: {type: 'Literal', value: 6}
				},
				right: {type: 'Literal', value: 7}
			}
		});
	});
	it('should handle a unary operator', function() {
		inst.addTokens(Lexer.tokenize('1*!!true-2'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: 'binOpSub',
			left: {
				type: 'BinaryExpression',
				operator: 'binOpMult',
				left: {type: 'Literal', value: 1},
				right: {
					type: 'UnaryExpression',
					operator: 'unOpNegate',
					right: {
						type: 'UnaryExpression',
						operator: 'unOpNegate',
						right: {type: 'Literal', value: true}
					}
				}
			},
			right: {type: 'Literal', value: 2}
		});
	});
	it('should handle a subexpression', function() {
		inst.addTokens(Lexer.tokenize('(2+3)*4'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: 'binOpMult',
			left: {
				type: 'BinaryExpression',
				operator: 'binOpAddConcat',
				left: {type: 'Literal', value: 2},
				right: {type: 'Literal', value: 3}
			},
			right: {type: 'Literal', value: 4}
		});
	});
	it('should handle nested subexpressions', function() {
		inst.addTokens(Lexer.tokenize('(4*(2+3))/5'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: 'binOpDiv',
			left: {
				type: 'BinaryExpression',
				operator: 'binOpMult',
				left: {type: 'Literal', value: 4},
				right: {
					type: 'BinaryExpression',
					operator: 'binOpAddConcat',
					left: {type: 'Literal', value: 2},
					right: {type: 'Literal', value: 3}
				}
			},
			right: {type: 'Literal', value: 5}
		});
	});
	it('should chain traversed identifiers', function() {
		inst.addTokens(Lexer.tokenize('foo.bar.baz + 1'));
		inst.complete().should.deep.equal({
			type: 'BinaryExpression',
			operator: 'binOpAddConcat',
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
		inst.addTokens(Lexer.tokenize('foo|tr1|tr2.baz|tr3{bar:"tek"}'));
		inst.complete().should.deep.equal({
			type: 'Transform',
			name: 'tr3',
			args: {bar: {type: 'Literal', value: 'tek'}},
			subject: {
				type: 'Identifier',
				value: 'baz',
				from: {
					type: 'Transform',
					name: 'tr2',
					subject: {
						type: 'Transform',
						name: 'tr1',
						subject: {
							type: 'Identifier',
							value: 'foo'
						}
					}
				}
			}
		});
	});
	it('should apply filters to identifiers', function() {
		inst.addTokens(Lexer.tokenize('foo[1][.bar[0]=="tek"].baz'));
		inst.complete().should.deep.equal({
			type: 'Identifier',
			value: 'baz',
			from: {
				type: 'FilterExpression',
				relative: true,
				expr: {
					type: 'BinaryExpression',
					operator: 'binOpCmpEq',
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
});
