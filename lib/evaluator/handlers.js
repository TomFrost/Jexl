/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var Stream = require('stream').Stream;

/**
 * Evaluates an ArrayLiteral by returning its value, with each element
 * independently run through the evaluator.
 * @param {{type: 'ObjectLiteral', value: <{}>}} ast An expression tree with an
 *      ObjectLiteral as the top node
 * @returns {Promise.<[]>} resolves to a map contained evaluated values.
 * @private
 */
exports.ArrayLiteral = function(ast) {
	return this.evalArray(ast.value);
};

/**
 * Evaluates an AssignmentExpression by creating a new context having
 * a named attribute which resolves with the subject.
 * @param {{type: 'AssignmentExpression', name: {}, subject: {} ast An expression tree
 *      with an AssignmentExpression as the top node
 * @private
 */
exports.AssignmentExpression = function(ast) {
	var self = this,
		newContext = {};
	Object.keys(this._context).forEach(function(k) {
		if (k !== ast.name)
			newContext[k] = this._context[k];
	}, this);
	newContext[ast.name] = this._deferred.promise.then(function() {
		return self.eval(ast.right);
	});
	this._context = newContext;
};

/**
 * Evaluates a BinaryExpression node by running the Grammar's evaluator for
 * the given operator.
 * @param {{type: 'BinaryExpression', operator: <string>, left: {},
 *      right: {}}} ast An expression tree with a BinaryExpression as the top
 *      node
 * @returns {Promise<*>} resolves with the value of the BinaryExpression.
 * @private
 */
exports.BinaryExpression = function(ast) {
	var self = this,
		binaryFn = self._grammar[ast.operator].eval;
	// If the arity of binaryFn is two, evaluation requires both left and right.
	if (binaryFn.length === 2) {
		return Promise.all([
			this.eval(ast.left),
			this.eval(ast.right)
		]).then(function(arr) {
			return binaryFn(arr[0], arr[1]);
		});
	} else {
		// If the arity of binaryFn is one, initially evaluate only the left.
		return this.eval(ast.left).then(function(leftRes) {
			var resultingFn = binaryFn(leftRes);
			// If the resulting function is nullary, return the result of
			// its execution, leaving the right unevaluated.
			if (!resultingFn.length)
				return resultingFn();
			// Evaluate the right, passing the result to the unary evaluation function.
			return self.eval(ast.right).then(resultingFn);
		});
	}
};

/**
 * Evaluates a CollectExpression by applying it to the subject value.
 * @param {{type: 'CollectExpression', relative: <boolean>, expr: {},
 *      subject: {}}} ast An expression tree with a CollectExpression as the top
 *      node
 * @returns {Promise<*>} resolves with the value of the CollectExpression.
 * @private
 */
exports.CollectExpression = function(ast) {
	return this._subProc(ast, 'Collect');
};

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
exports.ConditionalExpression = function(ast) {
	var self = this;
	return this.eval(ast.test).then(function(res) {
		if (res) {
			if (ast.consequent)
				return self.eval(ast.consequent);
			return res;
		}
		return self.eval(ast.alternate);
	});
};

/**
 * Evaluates a FindExpression by applying it to the subject value.
 * @param {{type: 'FindExpression', relative: <boolean>, expr: {},
 *      subject: {}}} ast An expression tree with a FindExpression as the top
 *      node
 * @returns {Promise<*>} resolves with the value of the FindExpression.
 * @private
 */
exports.FindExpression = function(ast) {
	return this._subProc(ast, 'Find');
};

/**
 * Evaluates a FilterExpression by applying it to the subject value.
 * @param {{type: 'FilterExpression', relative: <boolean>, expr: {},
 *      subject: {}}} ast An expression tree with a FilterExpression as the top
 *      node
 * @returns {Promise<*>} resolves with the value of the FilterExpression.
 * @private
 */
exports.FilterExpression = function(ast) {
	var self = this;
	return this.eval(ast.subject).then(function(subject) {
		if (ast.relative)
			return self._filterRelative(subject, ast.expr);
		return self._filterStatic(subject, ast.expr);
	});
};

/**
 * Evaluates an Identifier by either stemming from the evaluated 'from'
 * expression tree or accessing the context provided when this Evaluator was
 * constructed. Identification will not be attempted until the line number of
 * the ast is the lowest among extant lines.
 * @param {{type: 'Identifier', value: <string>, [from]: {}}} ast An expression
 *      tree with an Identifier as the top node
 * @returns {Promise<*>|*} either the identifier's value, or a Promise that
 *      will resolve with the identifier's value.
 * @private
 */
exports.Identifier = function(ast) {
	if (!ast.from) {
		return Promise.resolve((ast.relative ?
			this._relContext : this._context)[ast.value]);
	}
	return this.eval(ast.from).then(function(context) {
		context = Array.isArray(context) ? context[0] : (context || {});
		return context[ast.value];
	});
};

/**
 * Evaluates a LambdaExpression by returning a lambda bound to this evaluator.
 * @param {{type: 'LambdaExpression', lambda: <function>}} ast An expression
 *      tree with a LambdaExpression as its only node
 * @returns {function} A lambda inheriting the context of the evaluator.
 * @private
 */
exports.LambdaExpression = function(ast) {
	var Evaluator = require('./Evaluator');
	return (function() {
		var args = arguments,
			context = {},
			parentContext = this._context;
		ast.argNames.forEach(function(name, i) {
			context[name] = args[i];
		});
		Object.keys(parentContext).forEach(function(k) {
			if (!(k in context))
				context[k] = parentContext[k];
		});
		var evalInst = this.clone();
		evalInst._context = context;
		return evalInst.eval(ast.right);
	}).bind(this);
};

/**
 * Evaluates a Literal by returning its value property.
 * @param {{type: 'Literal', value: <string|number|boolean>}} ast An expression
 *      tree with a Literal as its only node
 * @returns {string|number|boolean} The value of the Literal node
 * @private
 */
exports.Literal = function(ast) {
	return ast.value;
};

/**
 * Evaluates an ObjectLiteral by returning its value, with each key
 * independently run through the evaluator.
 * @param {{type: 'ObjectLiteral', value: <{}>}} ast An expression tree with an
 *      ObjectLiteral as the top node
 * @returns {Promise<{}>} resolves to a map contained evaluated values.
 * @private
 */
exports.ObjectLiteral = function(ast) {
	return this.evalMap(ast.value);
};

/**
 * Evaluates a ReduceExpression by applying it to the subject value.
 * @param {{type: 'ReduceExpression', relative: <boolean>, expr: {},
 *      subject: {}}} ast An expression tree with a ReduceExpression as the top
 *      node
 * @returns {Promise<*>} resolves with the value of the ReduceExpression.
 * @private
 */
exports.ReduceExpression = function(ast) {
	return this._subProc(ast, 'Reduce');
};

/**
 * Evaluates a Transform node by applying a function from the transforms map
 * to the subject value.
 * @param {{type: 'Transform', name: <string>, subject: {}}} ast An
 *      expression tree with a Transform as the top node
 * @returns {Promise<*>|*} the value of the transformation, or a Promise that
 *      will resolve with the transformed value.
 * @private
 */
exports.Transform = function(ast) {
	var transform = this._transforms[ast.name];
	if (!transform)
		throw new Error("Transform '" + ast.name + "' is not defined.");
	return Promise.all([
		this.eval(ast.subject),
		this.evalArray(ast.args || [])
	]).then(function(arr) {
		return transform.apply(null, [arr[0]].concat(arr[1]));
	}).then(function(res) {
		if (Array.isArray(res))
			return Promise.all(res);
		return Promise.resolve(res);
	});
};

/**
 * Evaluates a Transform assignment by adding a function by name to the
 * transforms.
 * @param {{type: 'TransformAssignmentExpression', name: <string>,
 *      subject: {}}} ast An expression tree with a TransformAssignment as the
 *      top node
 * @private
 */
exports.TransformAssignmentExpression = function(ast) {
	var transforms = {};
	Object.keys(this._transforms).forEach(function(name) {
		transforms[name] = this._transforms[name];
	}, this);
	transforms[ast.name] = exports.LambdaExpression.call(this, ast);
	this._transforms = transforms;
};

/**
 * Evaluates a Unary expression by passing the right side through the
 * operator's eval function.
 * @param {{type: 'UnaryExpression', operator: <string>, right: {}}} ast An
 *      expression tree with a UnaryExpression as the top node
 * @returns {Promise<*>} resolves with the value of the UnaryExpression.
 * @constructor
 */
exports.UnaryExpression = function(ast) {
	var self = this;
	return this.eval(ast.right).then(function(right) {
		return self._grammar[ast.operator].eval(right);
	});
};
