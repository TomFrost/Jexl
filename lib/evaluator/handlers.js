/*
 * Jexl
 * Copyright 2020 Tom Shawver
 */

const poolNames = {
  functions: 'Jexl Function',
  transforms: 'Transform'
}

/**
 * Evaluates an ArrayLiteral by returning its value, with each element
 * independently run through the evaluator.
 * @param {{type: 'ObjectLiteral', value: <{}>}} ast An expression tree with an
 *      ObjectLiteral as the top node
 * @returns {Promise.<[]>} resolves to a map contained evaluated values.
 * @private
 */
exports.ArrayLiteral = function (ast) {
  return this.evalArray(ast.value)
}

/**
 * Evaluates a BinaryExpression node by running the Grammar's evaluator for
 * the given operator. Note that binary expressions support two types of
 * evaluators: `eval` is called with the left and right operands pre-evaluated.
 * `evalOnDemand`, if it exists, will be called with the left and right operands
 * each individually wrapped in an object with an "eval" function that returns
 * a promise with the resulting value. This allows the binary expression to
 * evaluate the operands conditionally.
 * @param {{type: 'BinaryExpression', operator: <string>, left: {},
 *      right: {}}} ast An expression tree with a BinaryExpression as the top
 *      node
 * @returns {Promise<*>} resolves with the value of the BinaryExpression.
 * @private
 */
exports.BinaryExpression = function (ast) {
  const grammarOp = this._grammar.elements[ast.operator]
  if (grammarOp.evalOnDemand) {
    const wrap = (subAst) => ({ eval: () => this.eval(subAst) })
    return grammarOp.evalOnDemand(wrap(ast.left), wrap(ast.right))
  }
  return this.Promise.all([
    this.eval(ast.left),
    this.eval(ast.right)
  ]).then((arr) => grammarOp.eval(arr[0], arr[1]))
}

/**
 * Evaluates a ConditionalExpression node by first evaluating its test branch,
 * and resolving with the consequent branch if the test is truthy, or the
 * alternate branch if it is not. If there is no consequent branch, the test
 * result will be used instead.
 * @param {{type: 'ConditionalExpression', test: {}, consequent: {},
 *      alternate: {}}} ast An expression tree with a ConditionalExpression as
 *      the top node
 * @private
 */
exports.ConditionalExpression = function (ast) {
  return this.eval(ast.test).then((res) => {
    if (res) {
      if (ast.consequent) {
        return this.eval(ast.consequent)
      }
      return res
    }
    return this.eval(ast.alternate)
  })
}

/**
 * Evaluates a FilterExpression by applying it to the subject value.
 * @param {{type: 'FilterExpression', relative: <boolean>, expr: {},
 *      subject: {}}} ast An expression tree with a FilterExpression as the top
 *      node
 * @returns {Promise<*>} resolves with the value of the FilterExpression.
 * @private
 */
exports.FilterExpression = function (ast) {
  return this.eval(ast.subject).then((subject) => {
    if (ast.relative) {
      return this._filterRelative(subject, ast.expr)
    }
    return this._filterStatic(subject, ast.expr)
  })
}

/**
 * Evaluates an Identifier by either stemming from the evaluated 'from'
 * expression tree or accessing the context provided when this Evaluator was
 * constructed.
 * @param {{type: 'Identifier', value: <string>, [from]: {}}} ast An expression
 *      tree with an Identifier as the top node
 * @returns {Promise<*>|*} either the identifier's value, or a Promise that
 *      will resolve with the identifier's value.
 * @private
 */
exports.Identifier = function (ast) {
  if (!ast.from) {
    return ast.relative ? this._relContext[ast.value] : this._context[ast.value]
  }
  return this.eval(ast.from).then((context) => {
    if (context === undefined || context === null) {
      return undefined
    }
    if (Array.isArray(context)) {
      context = context[0]
    }
    return context[ast.value]
  })
}

/**
 * Evaluates a Literal by returning its value property.
 * @param {{type: 'Literal', value: <string|number|boolean>}} ast An expression
 *      tree with a Literal as its only node
 * @returns {string|number|boolean} The value of the Literal node
 * @private
 */
exports.Literal = function (ast) {
  return ast.value
}

/**
 * Evaluates an ObjectLiteral by returning its value, with each key
 * independently run through the evaluator.
 * @param {{type: 'ObjectLiteral', value: <{}>}} ast An expression tree with an
 *      ObjectLiteral as the top node
 * @returns {Promise<{}>} resolves to a map contained evaluated values.
 * @private
 */
exports.ObjectLiteral = function (ast) {
  return this.evalMap(ast.value)
}

/**
 * Evaluates a FunctionCall node by applying the supplied arguments to a
 * function defined in one of the grammar's function pools.
 * @param {{type: 'FunctionCall', name: <string>}} ast An
 *      expression tree with a FunctionCall as the top node
 * @returns {Promise<*>|*} the value of the function call, or a Promise that
 *      will resolve with the resulting value.
 * @private
 */
exports.FunctionCall = function (ast) {
  const poolName = poolNames[ast.pool]
  if (!poolName) {
    throw new Error(`Corrupt AST: Pool '${ast.pool}' not found`)
  }
  const pool = this._grammar[ast.pool]
  const func = pool[ast.name]
  if (!func) {
    throw new Error(`${poolName} ${ast.name} is not defined.`)
  }
  return this.evalArray(ast.args || []).then((args) => func(...args))
}

/**
 * Evaluates a Unary expression by passing the right side through the
 * operator's eval function.
 * @param {{type: 'UnaryExpression', operator: <string>, right: {}}} ast An
 *      expression tree with a UnaryExpression as the top node
 * @returns {Promise<*>} resolves with the value of the UnaryExpression.
 * @constructor
 */
exports.UnaryExpression = function (ast) {
  return this.eval(ast.right).then((right) =>
    this._grammar.elements[ast.operator].eval(right)
  )
}
