/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),
	should = require('chai').should(),
	Jexl = require('../lib/Jexl');

if (!global.Promise)
	global.Promise = require('bluebird').Promise;

chai.use(chaiAsPromised);

var inst;

describe('Jexl', function() {
	beforeEach(function() {
		inst = new Jexl.Jexl();
	});
	it('should resolve Promise on success', function() {
		return inst.eval('2+2').should.become(4);
	});
	it('should reject Promise on error', function() {
		return inst.eval('2++2').should.reject;
	});
	it('should call callback with success result', function(done) {
		inst.eval('2+2', function(err, res) {
			res.should.equal(4);
			done(err);
		});
	});
	it('should call callback with error result', function(done) {
		inst.eval('2++2', function(err, res) {
			should.exist(err);
			should.not.exist(res);
			done();
		});
	});
	it('should allow transforms to be defined', function() {
		inst.addTransform('toCase', function(val, args) {
			if (args.case === 'upper')
				return val.toUpperCase();
			return val.toLowerCase();
		});
		return inst.eval('"hello"|toCase({case:"upper"})')
			.should.become('HELLO');
	});
	it('should allow transforms to be retrieved', function() {
		inst.addTransform('ret2', function() { return 2; });
		var t = inst.getTransform('ret2');
		should.exist(t);
		t().should.equal(2);
	});
	it('should allow transforms to be set in batch', function() {
		inst.addTransforms({
			add1: function(val) { return val + 1; },
			add2: function(val) { return val + 2; }
		});
		return inst.eval('2|add1|add2').should.become(5);
	});
	it('should pass context', function() {
		return inst.eval('foo', {foo: 'bar'}).should.become('bar');
	});
	it('should allow binaryOps to be defined', function() {
		inst.addBinaryOp('_=', 20, function(left, right) {
			return left.toLowerCase() === right.toLowerCase();
		});
		return inst.eval('"FoO" _= "fOo"').should.become(true);
	});
	it('should observe weight on binaryOps', function() {
		inst.addBinaryOp('**', 0, function(left, right) {
			return left * 2 + right * 2;
		});
		inst.addBinaryOp('***', 1000, function(left, right) {
			return left * 2 + right * 2;
		});
		return Promise.all([
			inst.eval('1 + 2 ** 3 + 4'),
			inst.eval('1 + 2 *** 3 + 4')
		]).should.become([20, 15]);
	});
	it('should allow unaryOps to be defined', function() {
		inst.addUnaryOp('~', function(right) {
			return Math.floor(right);
		});
		return inst.eval('~5.7 + 5').should.become(10);
	});
	it('should allow binaryOps to be removed', function() {
		inst.removeOp('+');
		return inst.eval.bind(inst, '1+2').should.throw;
	});
	it('should allow unaryOps to be removed', function() {
		inst.removeOp('!');
		return inst.eval.bind(inst, '!true').should.throw;
	});
	it('should allow assignment of a variable to context', function() {
		return inst.eval('foo=5+7; foo+3').should.become(15);
	});
	it('should properly assign a negative number to the context', function() {
		return inst.eval('foo=-3; foo+3').should.become(0);
	});
	it('should allow assignment of multiple variables to the context', function() {
		return inst.eval('foo=5+7; bar=foo*2; bar').should.become(24);
	});
	it('should allow succesive variable assignments to the context', function() {
		return inst.eval('foo=1; bar=foo*2; foo+=5; bar+foo').should.become(8);
	});
	it('should allow assignment of variables to the context within a subexpresion', function() {
		return inst.eval('foo=5+(bar = 7); foo').should.become(12);
	});
	it('should not change the supplied context variable', function() {
		var context = {};
		return inst.eval('foo=5+7; bar=foo*2; bar', context).then(function() {
			return Object.keys(context).length.should.equal(0);
		});
	});
	it('should allow use of lambda functions', function() {
		inst.addTransform('map', function(val, lambda) {
			return val.map(lambda);
		});
		return inst.eval('foo = [1,2,3] | map((n) -> n + 2); foo').should.eventually.deep.equal([3,4,5]);
	});
	it('should allow use of lambda functions with multiple arguments', function() {
		inst.addTransform('map', function(val, lambda) {
			return val.map(lambda);
		});
		return inst.eval('foo = [1,2,3] | map((n, i) -> n + i); foo').should.eventually.deep.equal([1,3,5]);
	});
	it('should throw when string literals are used as argument names', function() {
		inst.addTransform('map', function(val, lambda) {
			return val.map(lambda);
		});
		return inst.eval('foo = [1,2,3] | map(("n", i) -> n + i); foo').should.eventually.be.rejected;
	});
	it('should throw when number literals are used as argument names', function() {
		inst.addTransform('map', function(val, lambda) {
			return val.map(lambda);
		});
		return inst.eval('foo = [1,2,3] | map((5, i) -> n + i); foo').should.eventually.be.rejected;
	});
	it('should allow access of context variables within lambda functions with correct scope and not alter existing context', function() {
		var context = {other: 4, n: 17};
		inst.addTransform('map', function(val, lambda) {
			return val.map(lambda);
		});
		return inst.eval('foo = [1,2,3] | map((n) -> n + other); foo', context).then(function(res) {
			Object.keys(context).should.have.length(2);
			context.other.should.equal(4);
			context.n.should.equal(17);
			return Promise.resolve(res);
		}).should.eventually.deep.equal([5,6,7]);
	});
	it('should throw on an attempt to evaluate bare identifiers separated by commas', function() {
		return inst.eval('x, y', {x:1, y:2}).should.eventually.be.rejected;
	});
	it('should throw on a lambda declaration outside of a subexpresion', function() {
		return inst.eval('1 + -> 1').should.eventually.be.rejected;
	});
	it('should compile an expression', function() {
		var fn = inst.compile('foo');
		return Promise.all([
			fn({foo: 5}),
			fn({foo: 0})
		]).should.eventually.deep.equal([5,0]);
	});
	it('should throw when compiling an expression with invalid tokens', function() {
		var fn = inst.compile.bind(inst, '9foo');
		return fn.should.throw();
	});
});
