/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const numericRegex = /^-?(?:(?:[0-9]*\.[0-9]+)|[0-9]+)$/
const identRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
const escEscRegex = /\\\\/
const whitespaceRegex = /^\s*$/
const preOpRegexElems = [
  // Strings
  "'(?:(?:\\\\')|[^'])*'",
  '"(?:(?:\\\\")|[^"])*"',
  // Whitespace
  '\\s+',
  // Booleans
  '\\btrue\\b',
  '\\bfalse\\b'
]
const postOpRegexElems = [
  // Identifiers
  '[a-zA-Z_\\$][a-zA-Z0-9_\\$]*',
  // Numerics (without negative symbol)
  '(?:(?:[0-9]*\\.[0-9]+)|[0-9]+)'
]
const minusNegatesAfter = [
  'binaryOp',
  'unaryOp',
  'openParen',
  'openBracket',
  'question',
  'colon'
]

/**
 * Lexer is a collection of stateless, statically-accessed functions for the
 * lexical parsing of a Jexl string.  Its responsibility is to identify the
 * "parts of speech" of a Jexl expression, and tokenize and label each, but
 * to do only the most minimal syntax checking; the only errors the Lexer
 * should be concerned with are if it's unable to identify the utility of
 * any of its tokens.  Errors stemming from these tokens not being in a
 * sensible configuration should be left for the Parser to handle.
 * @type {{}}
 */
class Lexer {
  constructor(grammar) {
    this._grammar = grammar
  }

  /**
   * Splits a Jexl expression string into an array of expression elements.
   * @param {string} str A Jexl expression string
   * @returns {Array<string>} An array of substrings defining the functional
   *      elements of the expression.
   */
  getElements(str) {
    const regex = this._getSplitRegex()
    return str.split(regex).filter(elem => {
      // Remove empty strings
      return elem
    })
  }

  /**
   * Converts an array of expression elements into an array of tokens.  Note that
   * the resulting array may not equal the element array in length, as any
   * elements that consist only of whitespace get appended to the previous
   * token's "raw" property.  For the structure of a token object, please see
   * {@link Lexer#tokenize}.
   * @param {Array<string>} elements An array of Jexl expression elements to be
   *      converted to tokens
   * @returns {Array<{type, value, raw}>} an array of token objects.
   */
  getTokens(elements) {
    const tokens = []
    let negate = false
    for (let i = 0; i < elements.length; i++) {
      if (this._isWhitespace(elements[i])) {
        if (tokens.length) {
          tokens[tokens.length - 1].raw += elements[i]
        }
      } else if (elements[i] === '-' && this._isNegative(tokens)) {
        negate = true
      } else {
        if (negate) {
          elements[i] = '-' + elements[i]
          negate = false
        }
        tokens.push(this._createToken(elements[i]))
      }
    }
    // Catch a - at the end of the string. Let the parser handle that issue.
    if (negate) {
      tokens.push(this._createToken('-'))
    }
    return tokens
  }

  /**
   * Converts a Jexl string into an array of tokens.  Each token is an object
   * in the following format:
   *
   *     {
   *         type: <string>,
   *         [name]: <string>,
   *         value: <boolean|number|string>,
   *         raw: <string>
   *     }
   *
   * Type is one of the following:
   *
   *      literal, identifier, binaryOp, unaryOp
   *
   * OR, if the token is a control character its type is the name of the element
   * defined in the Grammar.
   *
   * Name appears only if the token is a control string found in
   * {@link grammar#elements}, and is set to the name of the element.
   *
   * Value is the value of the token in the correct type (boolean or numeric as
   * appropriate). Raw is the string representation of this value taken directly
   * from the expression string, including any trailing spaces.
   * @param {string} str The Jexl string to be tokenized
   * @returns {Array<{type, value, raw}>} an array of token objects.
   * @throws {Error} if the provided string contains an invalid token.
   */
  tokenize(str) {
    const elements = this.getElements(str)
    return this.getTokens(elements)
  }

  /**
   * Creates a new token object from an element of a Jexl string. See
   * {@link Lexer#tokenize} for a description of the token object.
   * @param {string} element The element from which a token should be made
   * @returns {{value: number|boolean|string, [name]: string, type: string,
   *      raw: string}} a token object describing the provided element.
   * @throws {Error} if the provided string is not a valid expression element.
   * @private
   */
  _createToken(element) {
    const token = {
      type: 'literal',
      value: element,
      raw: element
    }
    if (element[0] === '"' || element[0] === "'") {
      token.value = this._unquote(element)
    } else if (element.match(numericRegex)) {
      token.value = parseFloat(element)
    } else if (element === 'true' || element === 'false') {
      token.value = element === 'true'
    } else if (this._grammar[element]) {
      token.type = this._grammar[element].type
    } else if (element.match(identRegex)) {
      token.type = 'identifier'
    } else {
      throw new Error(`Invalid expression token: ${element}`)
    }
    return token
  }

  /**
   * Escapes a string so that it can be treated as a string literal within a
   * regular expression.
   * @param {string} str The string to be escaped
   * @returns {string} the RegExp-escaped string.
   * @see https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
   * @private
   */
  _escapeRegExp(str) {
    str = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (str.match(identRegex)) {
      str = '\\b' + str + '\\b'
    }
    return str
  }

  /**
   * Gets a RegEx object appropriate for splitting a Jexl string into its core
   * elements.
   * @returns {RegExp} An element-splitting RegExp object
   * @private
   */
  _getSplitRegex() {
    if (!this._splitRegex) {
      // Sort by most characters to least, then regex escape each
      const elemArray = Object.keys(this._grammar)
        .sort((a, b) => {
          return b.length - a.length
        })
        .map(elem => {
          return this._escapeRegExp(elem)
        }, this)
      this._splitRegex = new RegExp(
        '(' +
          [
            preOpRegexElems.join('|'),
            elemArray.join('|'),
            postOpRegexElems.join('|')
          ].join('|') +
          ')'
      )
    }
    return this._splitRegex
  }

  /**
   * Determines whether the addition of a '-' token should be interpreted as a
   * negative symbol for an upcoming number, given an array of tokens already
   * processed.
   * @param {Array<Object>} tokens An array of tokens already processed
   * @returns {boolean} true if adding a '-' should be considered a negative
   *      symbol; false otherwise
   * @private
   */
  _isNegative(tokens) {
    if (!tokens.length) return true
    return minusNegatesAfter.some(
      type => type === tokens[tokens.length - 1].type
    )
  }

  /**
   * A utility function to determine if a string consists of only space
   * characters.
   * @param {string} str A string to be tested
   * @returns {boolean} true if the string is empty or consists of only spaces;
   *      false otherwise.
   * @private
   */
  _isWhitespace(str) {
    return !!str.match(whitespaceRegex)
  }

  /**
   * Removes the beginning and trailing quotes from a string, unescapes any
   * escaped quotes on its interior, and unescapes any escaped escape
   * characters. Note that this function is not defensive; it assumes that the
   * provided string is not empty, and that its first and last characters are
   * actually quotes.
   * @param {string} str A string whose first and last characters are quotes
   * @returns {string} a string with the surrounding quotes stripped and escapes
   *      properly processed.
   * @private
   */
  _unquote(str) {
    const quote = str[0]
    const escQuoteRegex = new RegExp('\\\\' + quote, 'g')
    return str
      .substr(1, str.length - 2)
      .replace(escQuoteRegex, quote)
      .replace(escEscRegex, '\\')
  }
}

module.exports = Lexer
