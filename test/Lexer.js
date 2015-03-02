/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var should = require('chai').should(),
	Lexer = require('../lib/Lexer');

describe('Lexer', function() {
	describe('Elements', function() {
		it("should count a string as one element", function() {
			var str = '"foo"',
				elems = Lexer.getElements(str);
			elems.should.have.length(1);
			elems[0].should.equal(str);
		});
		it("should support single-quote strings", function() {
			var str = "'foo'",
				elems = Lexer.getElements(str);
			elems.should.have.length(1);
			elems[0].should.equal(str);
		});
		it("should support escaping double-quotes", function() {
			var str = '"f\\"oo"',
				elems = Lexer.getElements(str);
			elems.should.have.length(1);
			elems[0].should.equal(str);
		});
		it("should support escaping single-quotes", function() {
			var str = "'f\\'oo'",
				elems = Lexer.getElements(str);
			elems.should.have.length(1);
			elems[0].should.equal(str);
		});
		it("should count an identifier as one element", function() {
			var str = "alpha12345",
				elems = Lexer.getElements(str);
			elems.should.deep.equal([str]);
		});
	});
	describe('Tokens', function() {
		it("should unquote string elements", function() {
			var tokens = Lexer.getTokens(['"foo \\"bar\\\\"']);
			tokens.should.deep.equal([{
				type: 'literal',
				value: 'foo "bar\\',
				raw: '"foo \\"bar\\\\"'
			}]);
		});
		it("should recognize booleans", function() {
			var tokens = Lexer.getTokens(['true', 'false']);
			tokens.should.deep.equal([
				{
					type: 'literal',
					value: true,
					raw: 'true'
				},
				{
					type: 'literal',
					value: false,
					raw: 'false'
				}
			]);
		});
		it("should recognize numerics", function() {
			var tokens = Lexer.getTokens(['-7.6', '20']);
			tokens.should.deep.equal([
				{
					type: 'literal',
					value: -7.6,
					raw: '-7.6'
				},
				{
					type: 'literal',
					value: 20,
					raw: '20'
				}
			]);
		});
		it("should recognize binary operators", function() {
			var tokens = Lexer.getTokens(['+']);
			tokens.should.deep.equal([{
				type: 'binaryOp',
				name: 'binOpAddConcat',
				value: '+',
				raw: '+'
			}]);
		});
		it("should recognize unary operators", function() {
			var tokens = Lexer.getTokens(['!']);
			tokens.should.deep.equal([{
				type: 'unaryOp',
				name: 'unOpNegate',
				value: '!',
				raw: '!'
			}]);
		});
		it("should recognize control characters", function() {
			var tokens = Lexer.getTokens(['(']);
			tokens.should.deep.equal([{
				type: 'groupStart',
				name: 'groupStart',
				value: '(',
				raw: '('
			}]);
		});
		it("should recognize identifiers", function() {
			var tokens = Lexer.getTokens(['_foo9_bar']);
			tokens.should.deep.equal([{
				type: 'identifier',
				value: '_foo9_bar',
				raw: '_foo9_bar'
			}]);
		});
		it("should throw on invalid token", function() {
			var fn = Lexer.getTokens.bind(Lexer, ['9foo']);
			fn.should.throw();
		});
	});
	it("should tokenize a full expression", function() {
		var tokens = Lexer.tokenize('6+x -  -17.55*y<= !foo.bar["baz\\"foz"]');
		tokens.should.deep.equal([
			{type: 'literal', value: 6, raw: '6'},
			{type: 'binaryOp', name: 'binOpAddConcat', value: '+', raw: '+'},
			{type: 'identifier', value: 'x', raw: 'x '},
			{type: 'binaryOp', name: 'binOpSub', value: '-', raw: '-  '},
			{type: 'literal', value: -17.55, raw: '-17.55'},
			{type: 'binaryOp', name: 'binOpMult', value: '*', raw: '*'},
			{type: 'identifier', value: 'y', raw: 'y'},
			{type: 'binaryOp', name: 'binOpCmpLte', value: '<=', raw: '<= '},
			{type: 'unaryOp', name: 'unOpNegate', value: '!', raw: '!'},
			{type: 'identifier', value: 'foo', raw: 'foo'},
			{type: 'identTraverse', name: 'identTraverse', value: '.', raw: '.'},
			{type: 'identifier', value: 'bar', raw: 'bar'},
			{type: 'filterStart', name: 'filterStart', value: '[', raw: '['},
			{type: 'literal', value: 'baz"foz', raw: '"baz\\"foz"'},
			{type: 'filterEnd', name: 'filterEnd', value: ']', raw: ']'}
		]);
	});
});
