/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

/**
 * Handles a subexpression that's used to define a transform argument's value.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.argVal = function(ast) {
	this._cursor.args.push(ast);
};

/**
 * Handles new array literals by adding them as a new node in the AST,
 * initialized with an empty array.
 * @private
 */
exports.arrayStart = function() {
	this._placeAtCursor({
		type: 'ArrayLiteral',
		value: []
	});
};

/**
 * Handles a subexpression representing an element of an array literal.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.arrayVal = function(ast) {
	if (ast)
		this._cursor.value.push(ast);
};

/**
 * Handles tokens of type 'assignOp', indicating an operation that will
 * assign a named attribute to the context according to the result of the
 * right side.
 * @param {{type: <string>}} token A token object
 * @private
 */
exports.assignOp = function(token) {
	var parent = this._cursor._parent;
	var node = {
		type: 'AssignmentExpression',
		name: this._cursor.value,
		operator: token.value,
		lineNo: token.lineNo
	};
	this._setParent(this._cursor, node);
	this._cursor = parent;
	this._placeAtCursor(node);
};

/**
 * Handles tokens of type 'binaryOp', indicating an operation that has two
 * inputs: a left side and a right side.
 * @param {{type: <string>}} token A token object
 * @private
 */
exports.binaryOp = function(token) {
	var precedence = this._grammar[token.value].precedence || 0,
		parent = this._cursor._parent;
	while (parent && parent.operator &&
			this._grammar[parent.operator].precedence >= precedence) {
		this._cursor = parent;
		parent = parent._parent;
	}
	var node = {
		type: 'BinaryExpression',
		operator: token.value,
		left: this._cursor,
		lineNo: token.lineNo
	};
	this._setParent(this._cursor, node);
	this._cursor = parent;
	this._placeAtCursor(node);
};

/**
 * Handles successive nodes in an identifier chain.  More specifically, it
 * sets values that determine how the following identifier gets placed in the
 * AST.
 * @private
 */
exports.dot = function() {
	this._nextIdentEncapsulate = this._cursor &&
		(this._cursor.type != 'BinaryExpression' ||
		(this._cursor.type == 'BinaryExpression' && this._cursor.right)) &&
		this._cursor.type != 'UnaryExpression';
	this._nextIdentRelative = !this._cursor ||
		(this._cursor && !this._nextIdentEncapsulate);
	if (this._nextIdentRelative)
		this._relative = true;
};

/**
 * Handles a subexpression used for filtering an array returned by an
 * identifier chain.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.filter = function(ast) {
	this._placeBeforeCursor({
		type: 'FilterExpression',
		expr: ast,
		relative: this._subParser.isRelative(),
		subject: this._cursor
	});
};

/**
 * Handles identifier tokens by adding them as a new node in the AST.
 * @param {{type: <string>}} token A token object
 * @private
 */
exports.identifier = function(token) {
	var node = {
		type: 'Identifier',
		value: token.value,
		lineNo: token.lineNo
	};
	if (this._nextIdentEncapsulate) {
		node.from = this._cursor;
		this._placeBeforeCursor(node);
	}
	else {
		if (this._nextIdentRelative)
			node.relative = true;
		this._placeAtCursor(node);
	}
};

/**
 * Handles creation of an anonymous function to evaluate
 * the ast using a context with named arguments.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.lambdaExpressionEnd = function(ast) {
	var Evaluator = require('../evaluator/Evaluator');
	var argNames = this._cursor.argNames;
	this._cursor.lambda = function() {
		var args = arguments,
			context = {},
			parentContext = this._context;
		argNames.forEach(function(name, i) {
			context[name] = args[i];
		});
		Object.keys(parentContext).forEach(function(k) {
			if (!(k in context))
				context[k] = parentContext[k];
		});
		var evaluator = new Evaluator(this._grammar, this._transforms, context);
		return evaluator.eval(ast);
	};
};

/**
 * Handles identifier tokens when used to indicate the name of arguments
 * for a lambda expression.
 * @private
 */
exports.lambdaExpressionStart = function() {
	var argNames = [];
	var ref = this._tree;
	while (ref && ref.value) {
		argNames.push(ref.value);
		ref = ref.right;
	}
	this._tree = {
		type: 'LambdaExpression',
		argNames: argNames
	};
	this._cursor = this._tree;
};

/**
 * Handles literal values, such as strings, booleans, and numerics, by adding
 * them as a new node in the AST.
 * @param {{type: <string>}} token A token object
 * @private
 */
exports.literal = function(token) {
	this._placeAtCursor({
		type: 'Literal',
		value: token.value,
		lineNo: token.lineNo
	});
};

/**
 * Queues a new object literal key to be written once a value is collected.
 * @param {{type: <string>}} token A token object
 * @private
 */
exports.objKey = function(token) {
	this._curObjKey = token.value;
};

/**
 * Handles new object literals by adding them as a new node in the AST,
 * initialized with an empty object.
 * @private
 */
exports.objStart = function() {
	this._placeAtCursor({
		type: 'ObjectLiteral',
		value: {}
	});
};

/**
 * Handles an object value by adding its AST to the queued key on the object
 * literal node currently at the cursor.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.objVal = function(ast) {
	this._cursor.value[this._curObjKey] = ast;
};

/**
 * Handles traditional subexpressions, delineated with the groupStart and
 * groupEnd elements.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.subExpression = function(ast) {
	this._placeAtCursor(ast);
};

/**
 * Handles a completed alternate subexpression of a ternary operator.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.ternaryEnd = function(ast) {
	this._cursor.alternate = ast;
};

/**
 * Handles a completed consequent subexpression of a ternary operator.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.ternaryMid = function(ast) {
	this._cursor.consequent = ast;
};

/**
 * Handles the start of a new ternary expression by encapsulating the entire
 * AST in a ConditionalExpression node, and using the existing tree as the
 * test element.
 * @private
 */
exports.ternaryStart = function() {
	this._tree = {
		type: 'ConditionalExpression',
		test: this._tree
	};
	this._cursor = this._tree;
};

/**
 * Handles identifier tokens when used to indicate the name of a transform to
 * be applied.
 * @param {{type: <string>}} token A token object
 * @private
 */
exports.transform = function(token) {
	this._placeBeforeCursor({
		type: 'Transform',
		name: token.value,
		args: [],
		subject: this._cursor,
		lineNo: token.lineNo
	});
};

/**
 * Handles token of type 'unaryOp', indicating that the operation has only
 * one input: a right side.
 * @param {{type: <string>}} token A token object
 * @private
 */
exports.unaryOp = function(token) {
	this._placeAtCursor({
		type: 'UnaryExpression',
		operator: token.value,
		lineNo: token.lineNo
	});
};
