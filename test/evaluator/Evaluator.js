/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),
	should = require('chai').should(),
	Lexer = require('../../lib/Lexer'),
	Parser = require('../../lib/parser/Parser'),
	Evaluator = require('../../lib/evaluator/Evaluator'),
	grammar = require('../../lib/grammar').elements;

chai.use(chaiAsPromised);

var lexer = new Lexer(grammar);

function toTree(exp) {
	var p = new Parser(grammar);
	p.addTokens(lexer.tokenize(exp));
	return p.complete();
}

describe('Evaluator', function() {
	it('should evaluate an arithmetic expression', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('(2 + 3) * 4')).should.become(20);
	});
	it('should evaluate a string concat', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('"Hello" + (4+4) + "Wo\\"rld"'))
			.should.become('Hello8Wo"rld');
	});
	it('should evaluate a true comparison expression', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('2 > 1')).should.become(true);
	});
	it('should evaluate a false comparison expression', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('2 <= 1')).should.become(false);
	});
	it('should evaluate a complex expression', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('"foo" && 6 >= 6 && 0 + 1 && true'))
			.should.become(true);
	});
	it('should evaluate an identifier chain', function() {
		var context = {foo: {baz: {bar: 'tek'}}},
			e = new Evaluator(grammar, null, context);
		return e.eval(toTree('foo.baz.bar'))
			.should.become(context.foo.baz.bar);
	});
	it('should apply transforms', function() {
		var context = {foo: 10},
			half = function(val) {
				return val / 2;
			},
			e = new Evaluator(grammar, {half: half}, context);
		return e.eval(toTree('foo|half + 3')).should.become(8);
	});
	it('should filter arrays', function() {
		var context = {foo: {bar: [
				{tek: 'hello'},
				{tek: 'baz'},
				{tok: 'baz'}
			]}},
			e = new Evaluator(grammar, null, context);
		return e.eval(toTree('foo.bar[.tek == "baz"]'))
			.should.eventually.deep.equal([{tek: 'baz'}]);
	});
	it('should assume array index 0 when traversing', function() {
		var context = {foo: {bar: [
				{tek: {hello: 'world'}},
				{tek: {hello: 'universe'}}
			]}},
			e = new Evaluator(grammar, null, context);
		return e.eval(toTree('foo.bar.tek.hello')).should.become('world');
	});
	it('should make array elements addressable by index', function() {
		var context = {foo: {bar: [
				{tek: 'tok'},
				{tek: 'baz'},
				{tek: 'foz'}
			]}},
			e = new Evaluator(grammar, null, context);
		return e.eval(toTree('foo.bar[1].tek')).should.become('baz');
	});
	it('should allow filters to select object properties', function() {
		var context = {foo: {baz: {bar: 'tek'}}},
			e = new Evaluator(grammar, null, context);
		return e.eval(toTree('foo["ba" + "z"].bar'))
			.should.become(context.foo.baz.bar);
	});
	it('should throw when transform does not exist', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('"hello"|world')).should.reject;
	});
	it('should apply the DivFloor operator', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('7 // 2')).should.become(3);
	});
	it('should evaluate an object literal', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('{foo: {bar: "tek"}}'))
			.should.eventually.deep.equal({foo: {bar: 'tek'}});
	});
	it('should evaluate an empty object literal', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('{}'))
			.should.eventually.deep.equal({});
	});
	it('should evaluate a transform with multiple args', function() {
		var e = new Evaluator(grammar, {
			concat: function(val, a1, a2, a3) {
				return val + ": " + a1 + a2 + a3;
			}
		});
		return e.eval(toTree('"foo"|concat("baz", "bar", "tek")'))
			.should.become('foo: bazbartek');
	});
	it('should evaluate dot notation for object literals', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('{foo: "bar"}.foo')).should.become('bar');
	});
	it('should allow access to literal properties', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('"foo".length')).should.become(3);
	});
	it('should evaluate array literals', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('["foo", 1+2]'))
			.should.eventually.deep.equal(["foo", 3]);
	});
	it('should apply the "in" operator to strings', function() {
		var e = new Evaluator(grammar);
		return Promise.all([
			e.eval(toTree('"bar" in "foobartek"')).should.become(true),
			e.eval(toTree('"baz" in "foobartek"')).should.become(false)
		]);
	});
	it('should apply the "in" operator to arrays', function() {
		var e = new Evaluator(grammar);
		return Promise.all([
			e.eval(toTree('"bar" in ["foo","bar","tek"]')).should.become(true),
			e.eval(toTree('"baz" in ["foo","bar","tek"]')).should.become(false)
		]);
	});
	it('should evaluate a conditional expression', function() {
		var e = new Evaluator(grammar);
		return Promise.all([
			e.eval(toTree('"foo" ? 1 : 2')).should.become(1),
			e.eval(toTree('"" ? 1 : 2')).should.become(2)
		]);
	});
	it('should allow missing consequent in ternary', function() {
		var e = new Evaluator(grammar);
		return e.eval(toTree('"foo" ?: "bar"')).should.become("foo");
	});
});
