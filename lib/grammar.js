/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

/* eslint eqeqeq:0 */

/**
 * A map of all expression elements to their properties. Note that changes
 * here may require changes in the Lexer or Parser.
 * @type {{}}
 */
exports.elements = {
  '.': { type: 'dot' },
  '[': { type: 'openBracket' },
  ']': { type: 'closeBracket' },
  '|': { type: 'pipe' },
  '{': { type: 'openCurl' },
  '}': { type: 'closeCurl' },
  ':': { type: 'colon' },
  ',': { type: 'comma' },
  '(': { type: 'openParen' },
  ')': { type: 'closeParen' },
  '?': { type: 'question' },
  '+': {
    type: 'binaryOp',
    precedence: 30,
    eval: (left, right) => left + right
  },
  '-': {
    type: 'binaryOp',
    precedence: 30,
    eval: (left, right) => left - right
  },
  '*': {
    type: 'binaryOp',
    precedence: 40,
    eval: (left, right) => left * right
  },
  '/': {
    type: 'binaryOp',
    precedence: 40,
    eval: (left, right) => left / right
  },
  '//': {
    type: 'binaryOp',
    precedence: 40,
    eval: (left, right) => Math.floor(left / right)
  },
  '%': {
    type: 'binaryOp',
    precedence: 50,
    eval: (left, right) => left % right
  },
  '^': {
    type: 'binaryOp',
    precedence: 50,
    eval: (left, right) => Math.pow(left, right)
  },
  '==': {
    type: 'binaryOp',
    precedence: 20,
    eval: (left, right) => left == right
  },
  '!=': {
    type: 'binaryOp',
    precedence: 20,
    eval: (left, right) => left != right
  },
  '>': {
    type: 'binaryOp',
    precedence: 20,
    eval: (left, right) => left > right
  },
  '>=': {
    type: 'binaryOp',
    precedence: 20,
    eval: (left, right) => left >= right
  },
  '<': {
    type: 'binaryOp',
    precedence: 20,
    eval: (left, right) => left < right
  },
  '<=': {
    type: 'binaryOp',
    precedence: 20,
    eval: (left, right) => left <= right
  },
  '&&': {
    type: 'binaryOp',
    precedence: 10,
    eval: (left, right) => left && right
  },
  '||': {
    type: 'binaryOp',
    precedence: 10,
    eval: (left, right) => left || right
  },
  in: {
    type: 'binaryOp',
    precedence: 20,
    eval: (left, right) => {
      if (typeof right === 'string') {
        return right.indexOf(left) !== -1
      }
      if (Array.isArray(right)) {
        return right.some(elem => elem === left)
      }
      return false
    }
  },
  '!': {
    type: 'unaryOp',
    precedence: Infinity,
    eval: right => !right
  }
}
