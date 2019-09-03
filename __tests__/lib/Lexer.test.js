/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const grammar = require('lib/grammar').elements
const Lexer = require('lib/Lexer')

let inst

describe('Lexer', () => {
  beforeEach(() => {
    inst = new Lexer(grammar)
  })
  describe('Elements', () => {
    it('counts a string as one element', () => {
      const str = '"foo"'
      const elems = inst.getElements(str)
      expect(elems).toHaveLength(1)
      expect(elems[0]).toBe(str)
    })
    it('supports single-quote strings', () => {
      const str = "'foo'"
      const elems = inst.getElements(str)
      expect(elems).toHaveLength(1)
      expect(elems[0]).toEqual(str)
    })
    it('supports escaping double-quotes', () => {
      const str = '"f\\"oo"'
      const elems = inst.getElements(str)
      expect(elems).toHaveLength(1)
      expect(elems[0]).toEqual(str)
    })
    it('supports escaped double-quotes at the end of strings', () => {
      const str = '"foo\\""'
      const elems = inst.getElements(str)
      expect(elems).toHaveLength(1)
      expect(elems[0]).toEqual(str)
    })
    it('supports escaping single-quotes', () => {
      const str = "'f\\'oo'"
      const elems = inst.getElements(str)
      expect(elems).toHaveLength(1)
      expect(elems[0]).toEqual(str)
    })
    it('supports escaped single-quotes at the end of strings', () => {
      const str = "'foo\\''"
      const elems = inst.getElements(str)
      expect(elems).toHaveLength(1)
      expect(elems[0]).toEqual(str)
    })
    it('counts an identifier as one element', () => {
      const str = 'alpha12345'
      const elems = inst.getElements(str)
      expect(elems).toEqual([str])
    })
    it('does not split grammar elements out of transforms', () => {
      const str = 'inString'
      const elems = inst.getElements(str)
      expect(elems).toEqual([str])
    })
    it('allows an identifier to start with and contain $', () => {
      const str = '$my$Var'
      const elems = inst.getElements(str)
      expect(elems).toEqual([str])
    })
  })
  describe('Tokens', () => {
    it('unquotes string elements', () => {
      const tokens = inst.getTokens(['"foo \\"bar\\\\"'])
      expect(tokens).toEqual([
        {
          type: 'literal',
          value: 'foo "bar\\',
          raw: '"foo \\"bar\\\\"'
        }
      ])
    })
    it('recognizes booleans', () => {
      const tokens = inst.getTokens(['true', 'false'])
      expect(tokens).toEqual([
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
      ])
    })
    it('recognizes numerics', () => {
      const tokens = inst.getTokens(['-7.6', '20'])
      expect(tokens).toEqual([
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
      ])
    })
    it('recognizes binary operators', () => {
      const tokens = inst.getTokens(['+'])
      expect(tokens).toEqual([
        {
          type: 'binaryOp',
          value: '+',
          raw: '+'
        }
      ])
    })
    it('recognizes unary operators', () => {
      const tokens = inst.getTokens(['!'])
      expect(tokens).toEqual([
        {
          type: 'unaryOp',
          value: '!',
          raw: '!'
        }
      ])
    })
    it('recognizes control characters', () => {
      const tokens = inst.getTokens(['('])
      expect(tokens).toEqual([
        {
          type: 'openParen',
          value: '(',
          raw: '('
        }
      ])
    })
    it('recognizes identifiers', () => {
      const tokens = inst.getTokens(['_foo9_bar'])
      expect(tokens).toEqual([
        {
          type: 'identifier',
          value: '_foo9_bar',
          raw: '_foo9_bar'
        }
      ])
    })
    it('throws on invalid token', () => {
      const fn = inst.getTokens.bind(Lexer, ['9foo'])
      expect(fn).toThrow()
    })
  })
  it('tokenizes a full expression', () => {
    const tokens = inst.tokenize('6+x -  -17.55*y<= !foo.bar["baz\\"foz"]')
    expect(tokens).toEqual([
      { type: 'literal', value: 6, raw: '6' },
      { type: 'binaryOp', value: '+', raw: '+' },
      { type: 'identifier', value: 'x', raw: 'x ' },
      { type: 'binaryOp', value: '-', raw: '-  ' },
      { type: 'literal', value: -17.55, raw: '-17.55' },
      { type: 'binaryOp', value: '*', raw: '*' },
      { type: 'identifier', value: 'y', raw: 'y' },
      { type: 'binaryOp', value: '<=', raw: '<= ' },
      { type: 'unaryOp', value: '!', raw: '!' },
      { type: 'identifier', value: 'foo', raw: 'foo' },
      { type: 'dot', value: '.', raw: '.' },
      { type: 'identifier', value: 'bar', raw: 'bar' },
      { type: 'openBracket', value: '[', raw: '[' },
      { type: 'literal', value: 'baz"foz', raw: '"baz\\"foz"' },
      { type: 'closeBracket', value: ']', raw: ']' }
    ])
  })
  it('considers minus to be negative appropriately', () => {
    expect(inst.tokenize('-1?-2:-3')).toEqual([
      { type: 'literal', value: -1, raw: '-1' },
      { type: 'question', value: '?', raw: '?' },
      { type: 'literal', value: -2, raw: '-2' },
      { type: 'colon', value: ':', raw: ':' },
      { type: 'literal', value: -3, raw: '-3' }
    ])
  })
})
