/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var e = require('./Grammar').elements;

/**
 * A mapping of all states in the finite state machine to a set of instructions
 * for handling or transitioning into other states. Each state can be handled
 * in one of two schemes: a handler, or a tokenType map.
 *
 * The 'handler' property can be specified as a string, naming the Parser
 * function that should be called for every token ingested while the Parser
 * is in this state.  It is then the handler function's responsibility to
 * manually change the state when complete.  Alternatively, another property
 * named 'stateOnTrue' can be defined, containing the name of the state to
 * which to transition if the handler function returns with a truthy value.
 *
 * The preferred method of state handling is through the tokenTypes map.  This
 * is an object map of all legal token types to encounter in this state (and
 * any unexpected token types will generate a thrown error) to an options
 * object that defines how they're handled.  The available options are:
 *
 *      {string} toState: The name of the state to which to transition
 *          immediately after handling this token
 *      {string} handler: The name of the handler function to call when this
 *          token type is encountered in this state.  If omitted, the default
 *          function name is _handler_TYPE where TYPE is the token's 'type'
 *          property.  If the handler function does not exist, no call will
 *          be made and no error will be generated.  This is useful for tokens
 *          whose sole purpose is to transition to other states.
 *
 * Additionally, any state in which it is legal to mark the AST as completed
 * should have a 'completable' property set to boolean true.  Attempting to
 * call {@link Parser#complete} in any state without this property will result
 * in a thrown Error.
 *
 * @type {{}}
 */
var states = {
	expectOperand: {
		tokenTypes: {
			literal: {toState: 'expectBinOp'},
			identifier: {toState: 'identifier'},
			unaryOp: {},
			openParen: {toState: 'subExpression', handler: 'groupStart'},
			dot: {toState: 'identTraverse'}
		}
	},
	expectBinOp: {
		tokenTypes: {
			binaryOp: {toState: 'expectOperand'},
			pipe: {toState: 'expectTransform'}
		},
		completable: true
	},
	expectTransform: {
		tokenTypes: {
			identifier: {toState: 'postTransform', handler: 'transform'}
		}
	},
	expectArgKey: {
		tokenTypes: {
			identifier: {toState: 'expectKeyValSep', handler: 'argKey'},
			closeCurl: {toState: 'postTransform'}
		}
	},
	expectKeyValSep: {
		tokenTypes: {
			colon: {toState: 'argVal'}
		}
	},
	postTransform: {
		tokenTypes: {
			openCurl: {toState: 'expectArgKey', handler: 'transformArgsStart'},
			binaryOp: {toState: 'expectOperand'},
			dot: {toState: 'identTraverse'},
			openBracket: {toState: 'filter', handler: 'filterStart'},
			pipe: {toState: 'expectTransform'}
		},
		completable: true
	},
	identifier: {
		tokenTypes: {
			binaryOp: {toState: 'expectOperand'},
			dot: {toState: 'identTraverse'},
			openBracket: {toState: 'filter', handler: 'filterStart'},
			pipe: {toState: 'expectTransform'}
		},
		completable: true
	},
	identTraverse: {
		tokenTypes: {
			'identifier': {toState: 'identifier'}
		}
	},
	filter: {handler: 'filter', stateOnTrue: 'identifier'},
	subExpression: {handler: 'subExpression', stateOnTrue: 'expectBinOp'},
	argVal: {handler: 'argVal'}
};

var handlerPrefix = '_handle_';

/**
 * The Parser is a state machine that converts tokens from the {@link Lexer}
 * into an Abstract Syntax Tree (AST), capable of being evaluated in any
 * context by the {@link Evaluator}.  The Parser expects that all tokens
 * provided to it are legal and typed properly according to the
 * {@link Grammar}, but accepts that the tokens may still be in an invalid
 * order or in some other unparsable configuration that requires it to throw
 * an Error.
 * @param {string} [prefix] A string prefix to prepend to the expression string
 *      for error messaging purposes.  This is useful for when a new Parser is
 *      instantiated to parse an subexpression, as the parent Parser's
 *      expression string thus far can be passed for a more user-friendly
 *      error message.
 * @constructor
 */
function Parser(prefix) {
	this._state = 'expectOperand';
	this._tree = null;
	this._exprStr = prefix || '';
	this._relative = false;
}

/**
 * Processes a new token into the AST and manages the transitions of the state
 * machine.
 * @param {{type: <string>}} token A token object, as provided by the
 *      {@link Lexer#tokenize} function.
 * @throws {Error} if a token is added when the Parser has been marked as
 *      complete by {@link #complete}, or if an unexpected token type is added.
 */
Parser.prototype.addToken = function(token) {
	if (this._complete)
		throw new Error('Cannot add a new token to a completed Parser');
	this._exprStr += token.raw;
	var state = states[this._state];
	// If the state has its own handler, short-circuit and use it
	if (state.handler) {
		var result = this[handlerPrefix + state.handler].call(this, token);
		if (state.stateOnTrue && result)
			this._state = state.stateOnTrue;
	}
	else if (state.tokenTypes[token.type]) {
		// Otherwise, call the handler defined in tokenTypes or use the
		// default handler for this token type
		var typeOpts = state.tokenTypes[token.type],
			handleFunc = this[handlerPrefix + token.type];
		if (typeOpts.handler)
			handleFunc = this[handlerPrefix + typeOpts.handler];
		if (handleFunc)
			handleFunc.call(this, token);
		if (typeOpts.toState)
			this._state = typeOpts.toState;
	}
	else {
		throw new Error('Token ' + token.raw + ' (' + token.type +
			') unexpected in expression: ' + this._exprStr);
	}
};

/**
 * Processes an array of tokens iteratively through the {@link #addToken}
 * function.
 * @param {Array<{type: <string>}>} tokens An array of tokens, as provided by
 *      the {@link Lexer#tokenize} function.
 */
Parser.prototype.addTokens = function(tokens) {
	tokens.forEach(this.addToken, this);
};

/**
 * Marks this Parser instance as completed and retrieves the full AST.
 * @returns {{}} a full expression tree, ready for evaluation by the
 *      {@link Evaluator#eval} function.
 * @throws {Error} if the parser is not in a state where it's legal to end
 *      the expression, indicating that the expression is incomplete
 */
Parser.prototype.complete = function() {
	if (!states[this._state].completable)
		throw new Error('Unexpected end of expression: ' + this._exprStr);
	this._complete = true;
	return this._tree;
};

/**
 * Indicates whether the expression tree contains a relative path identifier.
 * @returns {boolean} true if a relative identifier exists; false otherwise.
 */
Parser.prototype.isRelative = function() {
	return this._relative;
};

/**
 * Handles an identifier token acting as the key for a transform's argument.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_argKey = function(token) {
	this._curArgKey = token.value;
};

/**
 * Handles a subexpression that's used to define a transform argument's value.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_argVal = function(token) {
	if (token.type == 'openCurl')
		this._subTracker++;
	else if (token.type == 'closeCurl')
		this._subTracker--;
	if (this._subTracker == -1 || (this._subTracker == 0 &&
			token.type == 'comma')) {
		this._cursor.args[this._curArgKey] = this._subParser.complete();
		if (token.type == 'comma')
			this._state = 'expectArgKey';
		else if (token.type == 'closeCurl')
			this._state = 'identifier';
	}
	else
		this._subParser.addToken(token);
};

/**
 * Handles tokens of type 'binaryOp', indicating an operation that has two
 * inputs: a left side and a right side.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_binaryOp = function(token) {
	var weight = e[token.value].weight || 0,
		parent = this._cursor._parent;
	while (parent && parent.operator &&
			e[parent.operator].weight >= weight) {
		this._cursor = parent;
		parent = parent._parent;
	}
	var node = {
		type: 'BinaryExpression',
		operator: token.value,
		left: this._cursor
	};
	this._setParent(this._cursor, node);
	this._cursor = parent;
	this._placeAtCursor(node);
};

/**
 * Handles the beginning of a transform argument value, preparing the Parser
 * to accept a subexpression.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_colon = function(token) {
	this._startSubExpression(0);
};

/**
 * Handles successive nodes in an identifier chain.  More specifically, it
 * sets values that determine how the following identifier gets placed in the
 * AST.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_dot = function(token) {
	this._nextIdentEncapsulate = this._cursor && (
	this._cursor.type == 'Identifier' ||
	this._cursor.type == 'FilterExpression' ||
	this._cursor.type == 'Transform'
	);
	this._nextIdentRelative = !this._cursor ||
	(this._cursor && !this._nextIdentEncapsulate);
	if (this._nextIdentRelative)
		this._relative = true;
};

/**
 * Handles a subexpression used for filtering an array returned by an
 * identifier chain.
 * @param {{type: <string>}} token A token object
 * @returns {boolean} true if the state machine should transition to the
 *      configured stateOnTrue; false otherwise.
 * @private
 */
Parser.prototype._handle_filter = function(token) {
	if (token.type == 'openBracket')
		this._subTracker++;
	else if (token.type == 'closeBracket')
		this._subTracker--;
	if (this._subTracker == 0) {
		var node = {
			type: 'FilterExpression',
			expr: this._subParser.complete(),
			relative: this._subParser.isRelative(),
			subject: this._cursor
		};
		this._placeBeforeCursor(node);
		return true;
	}
	this._subParser.addToken(token);
	return false;
};

/**
 * Handles a filter-starting token, indicating an upcoming subexpression.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_filterStart = function(token) {
	this._startSubExpression(1);
};

/**
 * Handles a group-starting token, indicating an upcoming subexpression.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_groupStart = function(token) {
	this._startSubExpression(1);
};

/**
 * Handles identifier tokens by adding them as a new node in the AST.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_identifier = function(token) {
	var node = {
		type: 'Identifier',
		value: token.value
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
 * Handles literal values, such as strings, booleans, and numerics, by adding
 * them as a new node in the AST.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_literal = function(token) {
	this._placeAtCursor({
		type: 'Literal',
		value: token.value
	});
};

/**
 * Handles traditional subexpressions, delineated with the groupStart and
 * groupEnd elements.
 * @param {{type: <string>}} token A token object
 * @returns {boolean} true if the state machine should transition to the
 *      configured stateOnTrue; false otherwise.
 * @private
 */
Parser.prototype._handle_subExpression = function(token) {
	if (token.type == 'openParen')
		this._subTracker++;
	else if (token.type == 'closeParen')
		this._subTracker--;
	if (this._subTracker == 0) {
		this._placeAtCursor(this._subParser.complete());
		return true;
	}
	this._subParser.addToken(token);
	return false;
};

/**
 * Handles identifier tokens when used to indicate the name of a transform to
 * be applied.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_transform = function(token) {
	var node = {
		type: 'Transform',
		name: token.value,
		subject: this._cursor
	};
	this._placeBeforeCursor(node);
};

/**
 * Handles the start of an argument block for a transform function.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_transformArgsStart = function(token) {
	this._cursor.args = {};
};

/**
 * Handles token of type 'unaryOp', indicating that the operation has only
 * one input: a right side.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_unaryOp = function(token) {
	this._placeAtCursor({
		type: 'UnaryExpression',
		operator: token.value
	});
};

/**
 * Places a new tree node at the current position of the cursor (to the 'right'
 * property) and then advances the cursor to the new node. This function also
 * handles setting the parent of the new node.
 * @param {{type: <string>}} node A node to be added to the AST
 * @private
 */
Parser.prototype._placeAtCursor = function(node) {
	if (!this._cursor)
		this._tree = node;
	else {
		this._cursor.right = node;
		this._setParent(node, this._cursor);
	}
	this._cursor = node;
};

/**
 * Places a tree node before the current position of the cursor, replacing
 * the node that the cursor currently points to. This should only be called in
 * cases where the cursor is known to exist, and the provided node already
 * contains a pointer to what's at the cursor currently.
 * @param {{type: <string>}} node A node to be added to the AST
 * @private
 */
Parser.prototype._placeBeforeCursor = function(node) {
	this._cursor = this._cursor._parent;
	this._placeAtCursor(node);
};

/**
 * Sets the parent of a node by creating a non-enumerable _parent property
 * that points to the supplied parent argument.
 * @param {{type: <string>}} node A node of the AST on which to set a new
 *      parent
 * @param {{type: <string>}} parent An existing node of the AST to serve as the
 *      parent of the new node
 * @private
 */
Parser.prototype._setParent = function(node, parent) {
	Object.defineProperty(node, '_parent', {
		value: parent,
		writable: true
	});
};

/**
 * Prepares the Parser to accept a subexpression by (re)instantiating the
 * subParser and resetting the subTracker, a number used to determine when
 * the subexpression has ended.
 * @param {number} trackerStart A number with which to initialize the
 *      subTracker
 * @private
 */
Parser.prototype._startSubExpression = function(trackerStart) {
	this._subParser = new Parser(this._exprStr);
	this._subTracker = trackerStart;
};

module.exports = Parser;
