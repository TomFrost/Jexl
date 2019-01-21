/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

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
 * Synchronously evaluates an ArrayLiteral by returning its value, with each element
 * independently run through the evaluator.
 * @param {{type: 'ObjectLiteral', value: <{}>}} ast An expression tree with an
 *      ObjectLiteral as the top node
 * @returns {[]} a map contained evaluated values.
 * @private
 */
exports.syncArrayLiteral = function (ast) {
  return this.syncEvalArray(ast.value)
}

/**
 * Evaluates a BinaryExpression node by running the Grammar's evaluator for
 * the given operator.
 * @param {{type: 'BinaryExpression', operator: <string>, left: {},
 *      right: {}}} ast An expression tree with a BinaryExpression as the top
 *      node
 * @returns {Promise<*>} resolves with the value of the BinaryExpression.
 * @private
 */
exports.BinaryExpression = function (ast) {
  return Promise.all([
    this.eval(ast.left),
    this.eval(ast.right)
  ]).then((arr) => {
    return this._grammar[ast.operator].eval(arr[0], arr[1])
  })
}

/**
 * Synchronously evaluates a BinaryExpression node by running the Grammar's evaluator for
 * the given operator.
 * @param {{type: 'BinaryExpression', operator: <string>, left: {},
 *      right: {}}} ast An expression tree with a BinaryExpression as the top
 *      node
 * @returns {*} the value of the BinaryExpression.
 * @private
 */
exports.syncBinaryExpression = function (ast) {
  return this._grammar[ast.operator].eval(
    this.syncEval(ast.left),
    this.syncEval(ast.right)
  )
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
    if (!res) {
      return this.eval(ast.alternate)
    }
    if (ast.consequent) {
      return this.eval(ast.consequent)
    }
    return res
  })
}

/**
 * Synchronously evaluates a ConditionalExpression node by first evaluating its test branch,
 * and resolving with the consequent branch if the test is truthy, or the
 * alternate branch if it is not. If there is no consequent branch, the test
 * result will be used instead.
 * @param {{type: 'ConditionalExpression', test: {}, consequent: {},
 *      alternate: {}}} ast An expression tree with a ConditionalExpression as
 *      the top node
 * @private
 */
exports.syncConditionalExpression = function (ast) {
  const res = this.syncEval(ast.test)
  if (!res) {
    return this.syncEval(ast.alternate)
  }
  if (ast.consequent) {
    return this.syncEval(ast.consequent)
  }
  return res
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
 * Synchronously evaluates a FilterExpression by applying it to the subject value.
 * @param {{type: 'FilterExpression', relative: <boolean>, expr: {},
 *      subject: {}}} ast An expression tree with a FilterExpression as the top
 *      node
 * @returns {*} the value of the FilterExpression.
 * @private
 */
exports.syncFilterExpression = function (ast) {
  const subject = this.syncEval(ast.subject)
  if (ast.relative) {
    return this._syncFilterRelative(subject, ast.expr)
  }
  return this._syncFilterStatic(subject, ast.expr)
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
    return _getIdentifier(context, ast)
  })
}

/**
 * Synchronously evaluates an Identifier by either stemming from the evaluated 'from'
 * expression tree or accessing the context provided when this Evaluator was
 * constructed.
 * @param {{type: 'Identifier', value: <string>, [from]: {}}} ast An expression
 *      tree with an Identifier as the top node
 * @returns {*} the identifier's value.
 * @private
 */
exports.syncIdentifier = function (ast) {
  if (!ast.from) {
    return ast.relative ? this._relContext[ast.value] : this._context[ast.value]
  }
  return _getIdentifier(this.syncEval(ast.from), ast)
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
 * Synchronously evaluates an ObjectLiteral by returning its value, with each key
 * independently run through the evaluator.
 * @param {{type: 'ObjectLiteral', value: <{}>}} ast An expression tree with an
 *      ObjectLiteral as the top node
 * @returns {{}} a map contained evaluated values.
 * @private
 */
exports.syncObjectLiteral = function (ast) {
  return this.syncEvalMap(ast.value)
}

/**
 * Evaluates a Transform node by applying a function from the transforms map
 * to the subject value.
 * @param {{type: 'Transform', name: <string>, subject: {}}} ast An
 *      expression tree with a Transform as the top node
 * @returns {Promise<*>|*} the value of the transformation, or a Promise that
 *      will resolve with the transformed value.
 * @private
 */
exports.Transform = function (ast) {
  const transform = _getTransform(this, ast)
  return Promise.all([
    this.eval(ast.subject),
    this.evalArray(ast.args || [])
  ]).then(function (arr) {
    return transform.apply(null, [arr[0]].concat(arr[1]))
  })
}

/**
 * Evaluates a Transform node by applying a function from the transforms map
 * to the subject value.
 * @param {{type: 'Transform', name: <string>, subject: {}}} ast An
 *      expression tree with a Transform as the top node
 * @returns {*} the value of the transformation.
 * @private
 */
exports.syncTransform = function (ast) {
  return _getTransform(this, ast).apply(
    null, [this.syncEval(ast.subject)].concat(this.syncEvalArray(ast.args || []))
  )
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
  return this.eval(ast.right).then((right) => {
    return this._grammar[ast.operator].eval(right)
  })
}

/**
 * Synchronously evaluates a Unary expression by passing the right side through the
 * operator's eval function.
 * @param {{type: 'UnaryExpression', operator: <string>, right: {}}} ast An
 *      expression tree with a UnaryExpression as the top node
 * @returns {*} the value of the UnaryExpression.
 * @constructor
 */
exports.syncUnaryExpression = function (ast) {
  return this._grammar[ast.operator].eval(this.syncEval(ast.right))
}

/**
 * Get the Transform from context(this) with ast.
 * @param {{}} context The thisArg from the call() method.
 * @param {{type: 'Transform', name: <string>, subject: {}}} ast An
 *      expression tree with a Transform as the top node
 * @returns {{}} the Transform.
 */
function _getTransform (context, ast) {
  const transform = context._transforms[ast.name]
  if (!transform) {
    throw new Error(`Transform ${ast.name} is not defined.`)
  }
  return transform
}

/**
 * Get the Identifier from context(this) with ast.
 * @param {{}} context The thisArg from the call() method.
 * @param {{type: 'Identifier', value: <string>, [from]: {}}} ast An expression
 *      tree with an Identifier as the top node
 * @returns {{}} the Identifier.
 */
function _getIdentifier (context, ast) {
  if (context === undefined) {
    return undefined
  }
  if (Array.isArray(context)) {
    context = context[0]
  }
  return context[ast.value]
}
