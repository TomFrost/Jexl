/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

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
 * a named attribute which resolves with the subject. Assignment will not be attempted
 * until the line number of the ast is the lowest among extant lines.
 * @param {{type: 'AssignmentExpression', name: {}, subject: {} ast An expression tree
 *      with an AssignmentExpression as the top node
 * @private
 */
exports.AssignmentExpression = function(ast) {
	var self = this;
	return new Promise(function(resolve, reject) {
		var assignExpression = function() {
			if (self._extantLines[0] < ast.lineNo)
				return setTimeout(assignExpression, 0);
			Promise.all([
				self._context[ast.name],
				self.eval(ast.right)
			]).then(function(arr) {
				return self._grammar[ast.operator].eval(arr[0], arr[1]);
			}).then(function(res) {
				var newContext = {};
				Object.keys(self._context).forEach(function(k) {
					if (k !== ast.name)
						newContext[k] = self._context[k];
				});
				self._context = newContext;
				self._context[ast.name] = res;
				resolve(res);
			}, reject);
		};
		assignExpression();
	});
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
	var self = this;
	return Promise.all([
		this.eval(ast.left),
		this.eval(ast.right)
	]).then(function(arr) {
		return self._grammar[ast.operator].eval(arr[0], arr[1]);
	});
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
	var self = this;
	return new Promise(function(resolve, reject) {
		var getIdentifier = function() {
			if (self._extantLines[0] < ast.lineNo)
				setTimeout(getIdentifier, 0);
			else if (ast.from) {
				self.eval(ast.from).then(function(context) {
					if (context === undefined)
						resolve(undefined);
					if (Array.isArray(context))
						context = context[0];
					Promise.resolve(context ? context[ast.value] : undefined).then(resolve);
				}, reject);
			}
			else {
				Promise.resolve(ast.relative ? self._relContext[ast.value] :
					self._context[ast.value]).then(resolve, reject);
			}
		};
		getIdentifier();
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
	return ast.lambda.bind(this);
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
