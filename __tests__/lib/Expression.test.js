/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const Jexl = require('lib/Jexl')
let inst

describe('Expression', () => {
  beforeEach(() => {
    inst = new Jexl.Jexl()
  })
  describe('compile', () => {
    it('returns the parent instance', () => {
      const expr = inst.createExpression('2/2')
      const compiled = expr.compile()
      expect(expr).toBe(compiled)
    })
    it('compiles the Expression', () => {
      const expr = inst.createExpression('2 & 2')
      const willFail = () => expr.compile('2 & 2')
      expect(willFail).toThrow('Invalid expression token: &')
    })
    it('compiles more than once if requested', () => {
      const expr = inst.createExpression('2*2')
      const spy = jest.spyOn(expr, 'compile')
      expr.compile()
      expr.compile()
      expect(spy).toHaveBeenCalledTimes(2)
    })
  })
  describe('eval', () => {
    it('resolves Promise on success', async () => {
      const expr = inst.createExpression('2/2')
      await expect(expr.eval()).resolves.toBe(1)
    })
    it('rejects Promise on error', async () => {
      const expr = inst.createExpression('2++2')
      await expect(expr.eval()).rejects.toThrow(/unexpected/)
    })
    it('passes context', async () => {
      const expr = inst.createExpression('foo')
      await expect(expr.eval({ foo: 'bar' })).resolves.toBe('bar')
    })
    it('never compiles more than once', async () => {
      const expr = inst.createExpression('2*2')
      const spy = jest.spyOn(expr, 'compile')
      await expr.eval()
      await expr.eval()
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
  describe('evalSync', () => {
    it('returns success', () => {
      const expr = inst.createExpression('2 % 2')
      expect(expr.evalSync()).toBe(0)
    })
    it('throws on error', () => {
      const expr = inst.createExpression('2++2')
      expect(expr.evalSync.bind(expr)).toThrow(/unexpected/)
    })
    it('passes context', () => {
      const expr = inst.createExpression('foo')
      expect(expr.evalSync({ foo: 'bar' })).toBe('bar')
    })
    it('never compiles more than once', () => {
      const expr = inst.createExpression('2*2')
      const spy = jest.spyOn(expr, 'compile')
      expr.evalSync()
      expr.evalSync()
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
