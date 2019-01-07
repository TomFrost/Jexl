/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

'use strict'

const Lexer = require('lib/Lexer')
const Parser = require('lib/parser/Parser')
const Evaluator = require('lib/evaluator/Evaluator')
const grammar = require('lib/grammar').elements

const lexer = new Lexer(grammar)

function toTree(exp) {
  const p = new Parser(grammar)
  p.addTokens(lexer.tokenize(exp))
  return p.complete()
}

describe('Evaluator', () => {
  it('evaluates an arithmetic expression', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('(2 + 3) * 4')).should.become(20)
  })
  it('evaluates a string concat', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('"Hello" + (4+4) + "Wo\\"rld"'))
      .should.become('Hello8Wo"rld')
  })
  it('evaluates a true comparison expression', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('2 > 1')).should.become(true)
  })
  it('evaluates a false comparison expression', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('2 <= 1')).should.become(false)
  })
  it('evaluates a complex expression', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('"foo" && 6 >= 6 && 0 + 1 && true'))
      .should.become(true)
  })
  it('evaluates an identifier chain', () => {
    const context = {foo: {baz: {bar: 'tek'}}}
    const e = new Evaluator(grammar, null, context)
    return e.eval(toTree('foo.baz.bar')).should.become(context.foo.baz.bar)
  })
  it('applys transforms', () => {
    const context = {foo: 10}
    const half = val => val / 2
    const e = new Evaluator(grammar, {half: half}, context)
    return e.eval(toTree('foo|half + 3')).should.become(8)
  })
  it('filters arrays', () => {
    const context = {
      foo: {
        bar: [
          {tek: 'hello'},
          {tek: 'baz'},
          {tok: 'baz'}
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return e.eval(toTree('foo.bar[.tek == "baz"]')).should.eventually.deep.equal([{tek: 'baz'}])
  })
  it('assumes array index 0 when traversing', () => {
    const context = {
      foo: {
        bar: [
          {tek: {hello: 'world'}},
          {tek: {hello: 'universe'}}
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return e.eval(toTree('foo.bar.tek.hello')).should.become('world')
  })
  it('makes array elements addressable by index', () => {
    const context = {
      foo: {
        bar: [
          {tek: 'tok'},
          {tek: 'baz'},
          {tek: 'foz'}
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return e.eval(toTree('foo.bar[1].tek')).should.become('baz')
  })
  it('allows filters to select object properties', () => {
    const context = {foo: {baz: {bar: 'tek'}}}
    const e = new Evaluator(grammar, null, context)
    return e.eval(toTree('foo["ba" + "z"].bar')).should.become(context.foo.baz.bar)
  })
  it('throws when transform does not exist', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('"hello"|world')).should.be.rejectedWith(Error)
  })
  it('applys the DivFloor operator', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('7 // 2')).should.become(3)
  })
  it('evaluates an object literal', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('{foo: {bar: "tek"}}')).should.eventually.deep.equal({foo: {bar: 'tek'}})
  })
  it('evaluates an empty object literal', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('{}')).should.eventually.deep.equal({})
  })
  it('evaluates a transform with multiple args', () => {
    const e = new Evaluator(grammar, {
      concat: (val, a1, a2, a3) => val + ': ' + a1 + a2 + a3
    })
    return e.eval(toTree('"foo"|concat("baz", "bar", "tek")')).should.become('foo: bazbartek')
  })
  it('evaluates dot notation for object literals', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('{foo: "bar"}.foo')).should.become('bar')
  })
  it('allows access to literal properties', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('"foo".length')).should.become(3)
  })
  it('evaluates array literals', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('["foo", 1+2]')).should.eventually.deep.equal(['foo', 3])
  })
  it('applys the "in" operator to strings', () => {
    const e = new Evaluator(grammar)
    return Promise.all([
      e.eval(toTree('"bar" in "foobartek"')).should.become(true),
      e.eval(toTree('"baz" in "foobartek"')).should.become(false)
    ])
  })
  it('applys the "in" operator to arrays', () => {
    const e = new Evaluator(grammar)
    return Promise.all([
      e.eval(toTree('"bar" in ["foo","bar","tek"]')).should.become(true),
      e.eval(toTree('"baz" in ["foo","bar","tek"]')).should.become(false)
    ])
  })
  it('evaluates a conditional expression', () => {
    const e = new Evaluator(grammar)
    return Promise.all([
      e.eval(toTree('"foo" ? 1 : 2')).should.become(1),
      e.eval(toTree('"" ? 1 : 2')).should.become(2)
    ])
  })
  it('allows missing consequent in ternary', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('"foo" ?: "bar"')).should.become('foo')
  })
  it('does not treat falsey properties as undefined', () => {
    const e = new Evaluator(grammar)
    return e.eval(toTree('"".length')).should.become(0)
  })
})
