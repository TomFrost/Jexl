/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var should = require('chai').should(),
	Lexer = require('../lib/Lexer'),
	grammar = require('../lib/grammar').elements;

if (!global.Promise)
	global.Promise = require('bluebird').Promise;

var inst;

describe('Lexer', function() {
	beforeEach(function() {
		inst = new Lexer(grammar);
	});
	describe('Elements', function() {
		it("should count a string as one element", function() {
			var str = '"foo"',
				elems = inst.getElements(str);
			elems.should.have.length(1);
			elems[0].should.equal(str);
		});
		it("should support single-quote strings", function() {
			var str = "'foo'",
				elems = inst.getElements(str);
			elems.should.have.length(1);
			elems[0].should.equal(str);
		});
		it("should support escaping double-quotes", function() {
			var str = '"f\\"oo"',
				elems = inst.getElements(str);
			elems.should.have.length(1);
			elems[0].should.equal(str);
		});
		it("should support escaping single-quotes", function() {
			var str = "'f\\'oo'",
				elems = inst.getElements(str);
			elems.should.have.length(1);
			elems[0].should.equal(str);
		});
		it("should count an identifier as one element", function() {
			var str = "alpha12345",
				elems = inst.getElements(str);
			elems.should.deep.equal([str]);
		});
		it("should not split grammar elements out of transforms", function() {
			var str = "inString",
				elems = inst.getElements(str);
			elems.should.deep.equal([str]);
		});
		it('should recognize unquoted grammar elements', function() {
			var str = "foo+-;bar",
				elems = inst.getElements(str);
			elems.should.deep.equal(['foo', '+', '-', ';', 'bar']);
		});
		it('should not split grammar elements out of strings', function() {
			var str = "'foo+-;bar'",
				elems = inst.getElements(str);
			elems.should.deep.equal([str]);
		});

	});
	describe('Tokens', function() {
		it("should unquote string elements", function() {
			var lines = inst.getTokenizedLines(['"foo \\"bar\\\\"']);
			lines.should.deep.equal([[{
				type: 'literal', lineNo: 0,
				value: 'foo "bar\\',
				raw: '"foo \\"bar\\\\"'
			}]]);
		});
		it("should recognize booleans", function() {
			var lines = inst.getTokenizedLines(['true', 'false']);
			lines.should.deep.equal([[
				{
					type: 'literal',
					lineNo: 0,
					value: true,
					raw: 'true'
				},
				{
					type: 'literal',
					lineNo: 0,
					value: false,
					raw: 'false'
				}
			]]);
		});
		it("should recognize numerics", function() {
			var lines = inst.getTokenizedLines(['-7.6', '20']);
			lines.should.deep.equal([[
				{
					type: 'literal',
					lineNo: 0,
					value: -7.6,
					raw: '-7.6'
				},
				{
					type: 'literal',
					lineNo: 0,
					value: 20,
					raw: '20'
				}
			]]);
		});
		it("should recognize binary operators", function() {
			var lines = inst.getTokenizedLines(['+']);
			lines.should.deep.equal([[{
				type: 'binaryOp', lineNo: 0,
				value: '+',
				raw: '+'
			}]]);
		});
		it("should recognize unary operators", function() {
			var lines = inst.getTokenizedLines(['!']);
			lines.should.deep.equal([[{
				type: 'unaryOp', lineNo: 0,
				value: '!',
				raw: '!'
			}]]);
		});
		it("should recognize control characters", function() {
			var lines = inst.getTokenizedLines(['(']);
			lines.should.deep.equal([[{
				type: 'openParen', lineNo: 0,
				value: '(',
				raw: '('
			}]]);
		});
		it("should recognize identifiers", function() {
			var lines = inst.getTokenizedLines(['_foo9_bar']);
			lines.should.deep.equal([[{
				type: 'identifier', lineNo: 0,
				value: '_foo9_bar',
				raw: '_foo9_bar'
			}]]);
		});
		it("should throw on invalid token", function() {
			var fn = inst.getTokenizedLines.bind(inst, ['9foo']);
			return fn.should.throw();
		});
	});
	it("should tokenize a full expression", function() {
		var lines = inst.tokenizeLines('6+x -  -17.55*y<= !foo.bar["baz\\"foz"]');
		lines.should.deep.equal([[
			{type: 'literal', lineNo: 0, value: 6, raw: '6'},
			{type: 'binaryOp', lineNo: 0, value: '+', raw: '+'},
			{type: 'identifier', lineNo: 0, value: 'x', raw: 'x '},
			{type: 'binaryOp', lineNo: 0, value: '-', raw: '-  '},
			{type: 'literal', lineNo: 0, value: -17.55, raw: '-17.55'},
			{type: 'binaryOp', lineNo: 0, value: '*', raw: '*'},
			{type: 'identifier', lineNo: 0, value: 'y', raw: 'y'},
			{type: 'binaryOp', lineNo: 0, value: '<=', raw: '<= '},
			{type: 'unaryOp', lineNo: 0, value: '!', raw: '!'},
			{type: 'identifier', lineNo: 0, value: 'foo', raw: 'foo'},
			{type: 'dot', lineNo: 0, value: '.', raw: '.'},
			{type: 'identifier', lineNo: 0, value: 'bar', raw: 'bar'},
			{type: 'openBracket', lineNo: 0, value: '[', raw: '['},
			{type: 'literal', lineNo: 0, value: 'baz"foz', raw: '"baz\\"foz"'},
			{type: 'closeBracket', lineNo: 0, value: ']', raw: ']'}
		]]);
	});
	it("should consider minus to be negative appropriately", function() {
		inst.tokenizeLines('-1?-2:-3').should.deep.equal([[
			{type: 'literal', lineNo: 0, value: -1, raw: '-1'},
			{type: 'question', lineNo: 0, value: '?', raw: '?'},
			{type: 'literal', lineNo: 0, value: -2, raw: '-2'},
			{type: 'colon', lineNo: 0, value: ':', raw: ':'},
			{type: 'literal', lineNo: 0, value: -3, raw: '-3'}
		]]);
	});
	it("should properly tokenize a multiline expression, ignoring lines of only whitespace", function() {
		inst.tokenizeLines('foo=5+7;\n   \n\n   \n;foo').should.deep.equal([
			[
				{type: 'identifier', lineNo: 0, value: 'foo', raw: 'foo'},
				{type: 'assignOp', lineNo: 0, value: '=', raw: '='},
				{type: 'literal', lineNo: 0, value: 5, raw: '5'},
				{type: 'binaryOp', lineNo: 0, value: '+', raw: '+'},
				{type: 'literal', lineNo: 0, value: 7, raw: '7'}
			],
			[
				{type: 'identifier', lineNo: 1, value: 'foo', raw: 'foo'}
			]
		]);
	});
});
