/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const Jexl = require('lib/Jexl')
let inst

describe('Sync Jexl', () => {
  beforeEach(() => {
    inst = new Jexl.Jexl()
  })

  it('sync eval', () => {
    expect(inst.syncEval('true == true')).toBe(true)
  })
  it('resolves Promise on success', () => {
    expect(inst.syncEval('2+2')).toBe(4)
  })
  it('rejects Promise on error', () => {
    const t = () => {
      inst.syncEval('2++2')
    }
    expect(t).toThrow(/unexpected/)
  })
  it('allows transforms to be defined', () => {
    inst.addTransform('toCase', (val, args) => args.case === 'upper' ? val.toUpperCase() : val.toLowerCase())
    expect(inst.syncEval('"hello"|toCase({case:"upper"})')).toBe('HELLO')
  })
  it('allows transforms to be retrieved', () => {
    inst.addTransform('ret2', () => 2)
    const t = inst.getTransform('ret2')
    expect(t).toBeDefined()
    expect(t()).toBe(2)
  })
  it('allows transforms to be set in batch', () => {
    inst.addTransforms({
      add1: (val) => val + 1,
      add2: (val) => val + 2
    })
    expect(inst.syncEval('2|add1|add2')).toBe(5)
  })
  it('passes context', async () => {
    await expect(inst.syncEval('foo', { foo: 'bar' })).toBe('bar')
  })
  it('allows binaryOps to be defined', () => {
    inst.addBinaryOp('_=', 20, (left, right) => left.toLowerCase() === right.toLowerCase())
    expect(inst.syncEval('"FoO" _= "fOo"')).toBe(true)
  })
  it('observes weight on binaryOps', () => {
    inst.addBinaryOp('**', 0, (left, right) => left * 2 + right * 2)
    inst.addBinaryOp('***', 1000, (left, right) => left * 2 + right * 2)
    expect([
      inst.syncEval('1 + 2 ** 3 + 4'),
      inst.syncEval('1 + 2 *** 3 + 4')
    ]).toEqual([20, 15])
  })
  it('allows unaryOps to be defined', () => {
    inst.addUnaryOp('~', (right) => Math.floor(right))
    expect(inst.syncEval('~5.7 + 5')).toBe(10)
  })
  it('allows binaryOps to be removed', async () => {
    inst.removeOp('+')
    await expect(inst.eval('1+2')).rejects.toThrow(/invalid/i)
  })
  it('allows unaryOps to be removed', async () => {
    inst.removeOp('!')
    await expect(inst.eval('!true')).rejects.toThrow(/invalid/i)
  })
})
