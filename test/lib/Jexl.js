/*
 * Jexl
 * Copyright (c) 2015-2016 TechnologyAdvice
 */

'use strict'

const Jexl = require('lib/Jexl')
let inst

describe('Jexl', () => {
  beforeEach(() => {
    inst = new Jexl.Jexl()
  })
  it('resolves Promise on success', () => {
    return inst.eval('2+2').should.become(4)
  })
  it('rejects Promise on error', () => {
    return inst.eval('2++2').should.reject
  })
  it('calls callback with success result', (done) => {
    inst.eval('2+2', (err, res) => {
      res.should.equal(4)
      done(err)
    })
  })
  it('calls callback with error result', (done) => {
    inst.eval('2++2', (err, res) => {
      should.exist(err)
      should.not.exist(res)
      done()
    })
  })
  it('allows transforms to be defined', () => {
    inst.addTransform('toCase', (val, args) => {
      return args.case === 'upper' ? val.toUpperCase() : val.toLowerCase()
    })
    return inst.eval('"hello"|toCase({case:"upper"})').should.become('HELLO')
  })
  it('allows transforms to be retrieved', () => {
    inst.addTransform('ret2', () => { return 2 })
    const t = inst.getTransform('ret2')
    should.exist(t)
    t().should.equal(2)
  })
  it('allows transforms to be set in batch', () => {
    inst.addTransforms({
      add1: (val) => { return val + 1 },
      add2: (val) => { return val + 2 }
    })
    return inst.eval('2|add1|add2').should.become(5)
  })
  it('passs context', () => {
    return inst.eval('foo', {foo: 'bar'}).should.become('bar')
  })
  it('allows binaryOps to be defined', () => {
    inst.addBinaryOp('_=', 20, (left, right) => {
      return left.toLowerCase() === right.toLowerCase()
    })
    return inst.eval('"FoO" _= "fOo"').should.become(true)
  })
  it('observes weight on binaryOps', () => {
    inst.addBinaryOp('**', 0, (left, right) => {
      return left * 2 + right * 2
    })
    inst.addBinaryOp('***', 1000, (left, right) => {
      return left * 2 + right * 2
    })
    return Promise.all([
      inst.eval('1 + 2 ** 3 + 4'),
      inst.eval('1 + 2 *** 3 + 4')
    ]).should.become([20, 15])
  })
  it('allows unaryOps to be defined', () => {
    inst.addUnaryOp('~', (right) => {
      return Math.floor(right)
    })
    return inst.eval('~5.7 + 5').should.become(10)
  })
  it('allows binaryOps to be removed', () => {
    inst.removeOp('+')
    return inst.eval('1+2').should.reject
  })
  it('allows unaryOps to be removed', () => {
    inst.removeOp('!')
    return inst.eval('!true').should.reject
  })
})
