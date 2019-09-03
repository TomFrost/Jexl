/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const Expression = require('./Expression')
const defaultGrammar = require('./grammar').elements

/**
 * Jexl is the Javascript Expression Language, capable of parsing and
 * evaluating basic to complex expression strings, combined with advanced
 * xpath-like drilldown into native Javascript objects.
 * @constructor
 */
class Jexl {
  constructor() {
    // Allow expr to be called outside of the jexl context
    this.expr = this.expr.bind(this)
    this._grammar = Object.assign({}, defaultGrammar)
    this._lexer = null
    this._transforms = {}
  }

  /**
   * Adds a binary operator to Jexl at the specified precedence. The higher the
   * precedence, the earlier the operator is applied in the order of operations.
   * For example, * has a higher precedence than +, because multiplication comes
   * before division.
   *
   * Please see grammar.js for a listing of all default operators and their
   * precedence values in order to choose the appropriate precedence for the
   * new operator.
   * @param {string} operator The operator string to be added
   * @param {number} precedence The operator's precedence
   * @param {function} fn A function to run to calculate the result. The function
   *      will be called with two arguments: left and right, denoting the values
   *      on either side of the operator. It should return either the resulting
   *      value, or a Promise that resolves with the resulting value.
   */
  addBinaryOp(operator, precedence, fn) {
    this._addGrammarElement(operator, {
      type: 'binaryOp',
      precedence: precedence,
      eval: fn
    })
  }

  /**
   * Adds a unary operator to Jexl. Unary operators are currently only supported
   * on the left side of the value on which it will operate.
   * @param {string} operator The operator string to be added
   * @param {function} fn A function to run to calculate the result. The function
   *      will be called with one argument: the literal value to the right of the
   *      operator. It should return either the resulting value, or a Promise
   *      that resolves with the resulting value.
   */
  addUnaryOp(operator, fn) {
    this._addGrammarElement(operator, {
      type: 'unaryOp',
      weight: Infinity,
      eval: fn
    })
  }

  /**
   * Adds or replaces a transform function in this Jexl instance.
   * @param {string} name The name of the transform function, as it will be used
   *      within Jexl expressions
   * @param {function} fn The function to be executed when this transform is
   *      invoked. It will be provided with at least one argument:
   *          - {*} value: The value to be transformed
   *          - {...*} args: The arguments for this transform
   */
  addTransform(name, fn) {
    this._transforms[name] = fn
  }

  /**
   * Syntactic sugar for calling {@link #addTransform} repeatedly.  This function
   * accepts a map of one or more transform names to their transform function.
   * @param {{}} map A map of transform names to transform functions
   */
  addTransforms(map) {
    for (let key in map) {
      if (map.hasOwnProperty(key)) {
        this._transforms[key] = map[key]
      }
    }
  }

  /**
   * Creates an Expression object from the given Jexl expression string, and
   * immediately compiles it. The returned Expression object can then be
   * evaluated multiple times with new contexts, without generating any
   * additional string processing overhead.
   * @param {string} expression The Jexl expression to be compiled
   * @returns {Expression} The compiled Expression object
   */
  compile(expression) {
    const exprObj = this.createExpression(expression)
    return exprObj.compile()
  }

  /**
   * Constructs an Expression object from a Jexl expression string.
   * @param {string} expression The Jexl expression to be wrapped in an
   *    Expression object
   * @returns {Expression} The Expression object representing the given string
   */
  createExpression(expression) {
    const lang = this._getLang()
    return new Expression(lang, expression)
  }

  /**
   * Retrieves a previously set transform function.
   * @param {string} name The name of the transform function
   * @returns {function} The transform function
   */
  getTransform(name) {
    return this._transforms[name]
  }

  /**
   * Asynchronously evaluates a Jexl string within an optional context.
   * @param {string} expression The Jexl expression to be evaluated
   * @param {Object} [context] A mapping of variables to values, which will be
   *      made accessible to the Jexl expression when evaluating it
   * @returns {Promise<*>} resolves with the result of the evaluation.
   */
  eval(expression, context = {}) {
    const exprObj = this.createExpression(expression)
    return exprObj.eval(context)
  }

  /**
   * Synchronously evaluates a Jexl string within an optional context.
   * @param {string} expression The Jexl expression to be evaluated
   * @param {Object} [context] A mapping of variables to values, which will be
   *      made accessible to the Jexl expression when evaluating it
   * @returns {*} the result of the evaluation.
   * @throws {*} on error
   */
  evalSync(expression, context = {}) {
    const exprObj = this.createExpression(expression)
    return exprObj.evalSync(context)
  }

  expr(strs, ...args) {
    const exprStr = strs.reduce((acc, str, idx) => {
      const arg = idx < args.length ? args[idx] : ''
      acc += str + arg
      return acc
    }, '')
    return this.createExpression(exprStr)
  }

  /**
   * Removes a binary or unary operator from the Jexl grammar.
   * @param {string} operator The operator string to be removed
   */
  removeOp(operator) {
    if (
      this._grammar[operator] &&
      (this._grammar[operator].type === 'binaryOp' ||
        this._grammar[operator].type === 'unaryOp')
    ) {
      delete this._grammar[operator]
    }
  }

  /**
   * Adds an element to the grammar map used by this Jexl instance.
   * @param {string} str The key string to be added
   * @param {{type: <string>}} obj A map of configuration options for this
   *      grammar element
   * @private
   */
  _addGrammarElement(str, obj) {
    this._grammar[str] = obj
  }

  /**
   * Gets an object defining the dynamic language elements of this Jexl
   * instance.
   * @returns {{ grammar: object, transforms: object }} A language definition
   *    object
   * @private
   */
  _getLang() {
    return {
      grammar: this._grammar,
      transforms: this._transforms
    }
  }
}

module.exports = new Jexl()
module.exports.Jexl = Jexl
