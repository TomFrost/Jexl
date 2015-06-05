/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

/**
 * Handles a subexpression that's used to define a transform argument's value.
 * @param {{type: <string>}} ast The subexpression tree
 */
exports.argVal = function(ast) {
	this._cursor.args.push(ast);
};

/**
 * Handles new array literals by adding them as a new node in the AST,
 * initialized with an empty array.
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
 * Handles a subexpression used for applying a subexpression over the values
 * of an object.
 * @param {{type: <string>}} ast The subexpression tree
 */
exports.collect = function (ast) {
	this._placeBeforeCursor({
		type: 'CollectExpression',
		expr: ast,
		relative: this._subParser.isRelative(),
		subject: this._cursor
	});
};

/**
 * Handles a collection of identifier tokens as argument names for a
 * future lambda expression.
 * @param {{type: <string>}} token A token object
 * @private
 */
exports.comma = function(token) {
	this._identifyArgNames = true;
};
/**
 * Handles successive nodes in an identifier chain.  More specifically, it
 * sets values that determine how the following identifier gets placed in the
 * AST.
 */
exports.dot = function(token) {
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
 */
exports.identifier = function(token) {
	var cur = this._cursor,
		isImmediateIdent = cur && cur.type === 'Identifier',
		node = {
			type: 'Identifier',
			value: token.value,
			lineNo: token.lineNo
		};
	// Encapsulate identifiers representing argument names and those in an
	// identifier chain.
	if (this._identifyArgNames || this._nextIdentEncapsulate ||
		(this._encapsulateImmediateIdent && isImmediateIdent)) {
		// A whole expression terminating in an argument name is incomplete.
		if (this._identifyArgNames)
			this._markIncompletable(node);
		node.from = this._cursor;
		this._placeBeforeCursor(node);
		this._encapsulateImmediateIdent = false;
	}
	else {
		if (this._nextIdentRelative)
			node.relative = true;
		// Identifier tokens immediately following identifier tokens in the
		// grammar are encapsulated.
		else if (this._grammar[token.value] && token.raw === token.value)
			this._encapsulateImmediateIdent = true;
		// Throw when the cursor is an identifier, but no behavior is
		// defined for the next identifier, indicating a bare identifier.
		else if (isImmediateIdent) {
			throw new Error();
		}
		this._placeAtCursor(node);
	}
};

/**
 * Handles creation of an anonymous function to evaluate
 * the ast using a context with named arguments.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
exports.lambdaExpression = function(ast) {
	var argNames = _fillArgNames(this._cursor);
	this._tree = {
		type: 'LambdaExpression',
		argNames: argNames,
		right: ast
	};
	this._cursor = this._tree;
};

/**
 * Handles literal values, such as strings, booleans, and numerics, by adding
 * them as a new node in the AST.
 * @param {{type: <string>}} token A token object
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
 */
exports.objKey = function(token) {
	this._curObjKey = token.value;
};

/**
 * Handles new object literals by adding them as a new node in the AST,
 * initialized with an empty object.
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
 */
exports.objVal = function(ast) {
	this._cursor.value[this._curObjKey] = ast;
};

/**
 * Handles traditional subexpressions, delineated with the groupStart and
 * groupEnd elements.
 * @param {{type: <string>}} ast The subexpression tree
 */
exports.subExpression = function(ast) {
	this._placeAtCursor(ast);
};

/**
 * Handles a completed alternate subexpression of a ternary operator.
 * @param {{type: <string>}} ast The subexpression tree
 */
exports.ternaryEnd = function(ast) {
	this._cursor.alternate = ast;
};

/**
 * Handles a completed consequent subexpression of a ternary operator.
 * @param {{type: <string>}} ast The subexpression tree
 */
exports.ternaryMid = function(ast) {
	this._cursor.consequent = ast;
};

/**
 * Handles the start of a new ternary expression by encapsulating the entire
 * AST in a ConditionalExpression node, and using the existing tree as the
 * test element.
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

var _fillArgNames = function(ref) {
	var argNames = [];
	while (ref) {
		if (ref.type !== 'Identifier')
			throw new Error();
		argNames.push(ref.value);
		ref = ref.from;
	}
	argNames.reverse();
	return argNames;
};

exports.transformAssignment = function(ast) {
	if (this._cursor.type === 'Identifier') {
		var parent = this._cursor._parent,
			ref = (ast.type === 'turnstile' ? undefined : ast),
			argNames = ['@'].concat(_fillArgNames(ref));
		var node = {
			type: 'TransformAssignmentExpression',
			name: this._cursor.value,
			argNames: argNames
		};
		this._setParent(this._cursor, node);
		this._cursor = parent;
		this._placeAtCursor(node);
	}
};

/**
 * Handles token of type 'unaryOp', indicating that the operation has only
 * one input: a right side.
 * @param {{type: <string>}} token A token object
 */
exports.unaryOp = function(token) {
	this._placeAtCursor({
		type: 'UnaryExpression',
		operator: token.value,
		lineNo: token.lineNo
	});
};
