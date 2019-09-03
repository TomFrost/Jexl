/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const Evaluator = require('./evaluator/Evaluator')
const Lexer = require('./Lexer')
const Parser = require('./parser/Parser')
const PromiseSync = require('./PromiseSync')

class Expression {
  constructor(lang, exprStr) {
    this._lang = lang
    this._lexer = new Lexer(lang.grammar)
    this._exprStr = exprStr
    this._ast = null
  }

  /**
   * Forces a compilation of the expression string that this Expression object
   * was constructed with. This function can be called multiple times; useful
   * if the language elements of the associated Jexl instance change.
   * @returns {Expression} this Expression instance, for convenience
   */
  compile() {
    const lexer = new Lexer(this._lang.grammar)
    const parser = new Parser(this._lang.grammar)
    const tokens = lexer.tokenize(this._exprStr)
    parser.addTokens(tokens)
    this._ast = parser.complete()
    return this
  }

  /**
   * Asynchronously evaluates the expression within an optional context.
   * @param {Object} [context] A mapping of variables to values, which will be
   *      made accessible to the Jexl expression when evaluating it
   * @returns {Promise<*>} resolves with the result of the evaluation.
   */
  eval(context = {}) {
    return this._eval(context, Promise)
  }

  /**
   * Synchronously evaluates the expression within an optional context.
   * @param {Object} [context] A mapping of variables to values, which will be
   *      made accessible to the Jexl expression when evaluating it
   * @returns {*} the result of the evaluation.
   * @throws {*} on error
   */
  evalSync(context = {}) {
    const res = this._eval(context, PromiseSync)
    if (res.error) throw res.error
    return res.value
  }

  _eval(context, promise) {
    return promise.resolve().then(() => {
      const ast = this._getAst()
      const evaluator = new Evaluator(
        this._lang.grammar,
        this._lang.transforms,
        context,
        undefined,
        promise
      )
      return evaluator.eval(ast)
    })
  }

  _getAst() {
    if (!this._ast) this.compile()
    return this._ast
  }
}

module.exports = Expression
