/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const Lexer = require('lib/Lexer')
const Parser = require('lib/parser/Parser')
const Evaluator = require('lib/evaluator/Evaluator')
const grammar = require('lib/grammar').elements

const lexer = new Lexer(grammar)

const toTree = (exp) => {
  const p = new Parser(grammar)
  p.addTokens(lexer.tokenize(exp))
  return p.complete()
}

describe('Sync Evaluator', () => {
  it('evaluates an arithmetic expression', async () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('(2 + 3) * 4'))).toBe(20)
  })
  it('evaluates a string concat', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('"Hello" + (4+4) + "Wo\\"rld"'))).toBe('Hello8Wo"rld')
  })
  it('evaluates a true comparison expression', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('2 > 1'))).toBe(true)
  })
  it('evaluates a false comparison expression', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('2 <= 1'))).toBe(false)
  })
  it('evaluates a complex expression', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('"foo" && 6 >= 6 && 0 + 1 && true'))).toBe(true)
  })
  it('evaluates an identifier chain', () => {
    const context = { foo: { baz: { bar: 'tek' } } }
    const e = new Evaluator(grammar, null, context)
    return expect(e.syncEval(toTree('foo.baz.bar'))).toBe(context.foo.baz.bar)
  })
  it('applys transforms', () => {
    const context = { foo: 10 }
    const half = val => val / 2
    const e = new Evaluator(grammar, { half: half }, context)
    return expect(e.syncEval(toTree('foo|half + 3'))).toBe(8)
  })
  it('filters arrays', () => {
    const context = {
      foo: {
        bar: [
          { tek: 'hello' },
          { tek: 'baz' },
          { tok: 'baz' }
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return expect(e.syncEval(toTree('foo.bar[.tek == "baz"]'))).toEqual([{ tek: 'baz' }])
  })
  it('assumes array index 0 when traversing', () => {
    const context = {
      foo: {
        bar: [
          { tek: { hello: 'world' } },
          { tek: { hello: 'universe' } }
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return expect(e.syncEval(toTree('foo.bar.tek.hello'))).toBe('world')
  })
  it('makes array elements addressable by index', () => {
    const context = {
      foo: {
        bar: [
          { tek: 'tok' },
          { tek: 'baz' },
          { tek: 'foz' }
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return expect(e.syncEval(toTree('foo.bar[1].tek'))).toBe('baz')
  })
  it('allows filters to select object properties', () => {
    const context = { foo: { baz: { bar: 'tek' } } }
    const e = new Evaluator(grammar, null, context)
    return expect(e.syncEval(toTree('foo["ba" + "z"].bar'))).toBe(context.foo.baz.bar)
  })
  it('throws when transform does not exist', () => {
    const e = new Evaluator(grammar)
    const t = () => {
      e.syncEval(toTree('"hello"|world'))
    }
    return expect(t).toThrow(Error)
  })
  it('applys the DivFloor operator', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('7 // 2'))).toBe(3)
  })
  it('evaluates an object literal', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('{foo: {bar: "tek"}}'))).toEqual({ foo: { bar: 'tek' } })
  })
  it('evaluates an empty object literal', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('{}'))).toEqual({})
  })
  it('evaluates a transform with multiple args', () => {
    const e = new Evaluator(grammar, {
      concat: (val, a1, a2, a3) => val + ': ' + a1 + a2 + a3
    })
    return expect(e.syncEval(toTree('"foo"|concat("baz", "bar", "tek")'))).toBe('foo: bazbartek')
  })
  it('evaluates dot notation for object literals', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('{foo: "bar"}.foo'))).toBe('bar')
  })
  it('allows access to literal properties', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('"foo".length'))).toBe(3)
  })
  it('evaluates array literals', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('["foo", 1+2]'))).toEqual(['foo', 3])
  })
  it('applys the "in" operator to strings', () => {
    const e = new Evaluator(grammar)
    expect(e.syncEval(toTree('"bar" in "foobartek"'))).toBe(true)
    expect(e.syncEval(toTree('"baz" in "foobartek"'))).toBe(false)
  })
  it('applys the "in" operator to arrays', () => {
    const e = new Evaluator(grammar)
    expect(e.syncEval(toTree('"bar" in ["foo","bar","tek"]'))).toBe(true)
    expect(e.syncEval(toTree('"baz" in ["foo","bar","tek"]'))).toBe(false)
  })
  it('evaluates a conditional expression', () => {
    const e = new Evaluator(grammar)
    expect(e.syncEval(toTree('"foo" ? 1 : 2'))).toBe(1)
    expect(e.syncEval(toTree('"" ? 1 : 2'))).toBe(2)
  })
  it('allows missing consequent in ternary', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('"foo" ?: "bar"'))).toBe('foo')
  })
  it('does not treat falsey properties as undefined', () => {
    const e = new Evaluator(grammar)
    return expect(e.syncEval(toTree('"".length'))).toBe(0)
  })
})
