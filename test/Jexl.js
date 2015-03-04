/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),
	should = require('chai').should(),
	Jexl = require('../lib/Jexl');

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
});
