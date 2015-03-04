/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var e = require('./Grammar').elements;

/**
 * A mapping of all states in the finite state machine to a set of instructions
 * for handling or transitioning into other states. Each state can be handled
 * in one of two schemes: a tokenType map, or a subHandler.
 *
 * Standard expression elements are handled through the tokenType object. This
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
 * States that consume a subexpression should define a subHandler, naming the
 * function to be called with an expression tree argument when the
 * subexpression is complete. Completeness is determined through the
 * endStates object, which maps tokens on which an expression should end to the
 * state to which to transition once the subHandler function has been called.
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
			openParen: {toState: 'subExpression'},
			openCurl: {toState: 'expectObjKey', handler: 'objStart'},
			dot: {toState: 'traverse'},
			openBracket: {toState: 'arrayVal', handler: 'arrayStart'}
		}
	},
	expectBinOp: {
		tokenTypes: {
			binaryOp: {toState: 'expectOperand'},
			pipe: {toState: 'expectTransform'},
			dot: {toState: 'traverse'},
			question: {toState: 'ternaryMid', handler: 'ternaryStart'}
		},
		completable: true
	},
	expectTransform: {
		tokenTypes: {
			identifier: {toState: 'postTransform', handler: 'transform'}
		}
	},
	expectObjKey: {
		tokenTypes: {
			identifier: {toState: 'expectKeyValSep', handler: 'objKey'},
			closeCurl: {toState: 'expectBinOp'}
		}
	},
	expectKeyValSep: {
		tokenTypes: {
			colon: {toState: 'objVal'}
		}
	},
	postTransform: {
		tokenTypes: {
			openParen: {toState: 'argVal'},
			binaryOp: {toState: 'expectOperand'},
			dot: {toState: 'traverse'},
			openBracket: {toState: 'filter'},
			pipe: {toState: 'expectTransform'}
		},
		completable: true
	},
	postTransformArgs: {
		tokenTypes: {
			binaryOp: {toState: 'expectOperand'},
			dot: {toState: 'traverse'},
			openBracket: {toState: 'filter'},
			pipe: {toState: 'expectTransform'}
		},
		completable: true
	},
	identifier: {
		tokenTypes: {
			binaryOp: {toState: 'expectOperand'},
			dot: {toState: 'traverse'},
			openBracket: {toState: 'filter'},
			pipe: {toState: 'expectTransform'},
			question: {toState: 'ternaryMid', handler: 'ternaryStart'}
		},
		completable: true
	},
	traverse: {
		tokenTypes: {
			'identifier': {toState: 'identifier'}
		}
	},
	filter: {
		subHandler: 'filter',
		endStates: {
			closeBracket: 'identifier'
		}
	},
	subExpression: {
		subHandler: 'subExpression',
		endStates: {
			closeParen: 'expectBinOp'
		}
	},
	argVal: {
		subHandler: 'argVal',
		endStates: {
			comma: 'argVal',
			closeParen: 'postTransformArgs'
		}
	},
	objVal: {
		subHandler: 'objVal',
		endStates: {
			comma: 'expectObjKey',
			closeCurl: 'expectBinOp'
		}
	},
	arrayVal: {
		subHandler: 'arrayVal',
		endStates: {
			comma: 'arrayVal',
			closeBracket: 'expectBinOp'
		}
	},
	ternaryMid: {
		subHandler: 'ternaryMid',
		balance: {
			question: 1,
			colon: -1
		},
		endStates: {
			colon: 'ternaryEnd'
		}
	},
	ternaryEnd: {
		subHandler: 'ternaryEnd',
		completable: true
	}
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
	this._balance = 0;
	this._subMarker = null;
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
	var state = states[this._state],
		elem = e[token.value],
		lastBalance = this._balance;
	if (elem)
		this._balance += e[token.value].balance || 0;
	if (state.balance)
		this._balance += state.balance[token.type] || 0;
	// If the state is a subExpression, short circuit and forward the token
	if (state.subHandler) {
		if (this._subMarker === null)
			this._startSubExpression(lastBalance);
		if (lastBalance === this._subMarker && state.endStates &&
				state.endStates[token.type]) {
			this._endSubExpression(token);
		}
		else
			this._subParser.addToken(token);
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
 * @returns {{}|null} a full expression tree, ready for evaluation by the
 *      {@link Evaluator#eval} function, or null if no tokens were passed to
 *      the parser before complete was called
 * @throws {Error} if the parser is not in a state where it's legal to end
 *      the expression, indicating that the expression is incomplete
 */
Parser.prototype.complete = function() {
	if (this._cursor && !states[this._state].completable)
		throw new Error('Unexpected end of expression: ' + this._exprStr);
	if (this._subMarker)
		this._endSubExpression();
	this._complete = true;
	return this._cursor ? this._tree : null;
};

/**
 * Indicates whether the expression tree contains a relative path identifier.
 * @returns {boolean} true if a relative identifier exists; false otherwise.
 */
Parser.prototype.isRelative = function() {
	return this._relative;
};

/**
 * Ends a subexpression by completing the subParser and passing its result
 * to the subHandler configured in the current state.  If the ending token
 * is provided and the state has an endStates map, the state will automatically
 * be transitioned.
 * @param {{type: <string>}} [token] The token object that ended the
 *      subexpression, if applicable
 * @private
 */
Parser.prototype._endSubExpression = function(token) {
	var state = states[this._state],
		subAST = this._subParser.complete();
	this[handlerPrefix + state.subHandler].call(this, subAST);
	if (token && state.endStates)
		this._state = state.endStates[token.type];
	this._subMarker = null;
};

/**
 * Handles a subexpression that's used to define a transform argument's value.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
Parser.prototype._handle_argVal = function(ast) {
	this._cursor.args.push(ast);
};

/**
 * Handles new array literals by adding them as a new node in the AST,
 * initialized with an empty array.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_arrayStart = function(token) {
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
Parser.prototype._handle_arrayVal = function(ast) {
	if (ast)
		this._cursor.value.push(ast);
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
 * Handles successive nodes in an identifier chain.  More specifically, it
 * sets values that determine how the following identifier gets placed in the
 * AST.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_dot = function(token) {
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
Parser.prototype._handle_filter = function(ast) {
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
 * Queues a new object literal key to be written once a value is collected.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_objKey = function(token) {
	this._curObjKey = token.value;
};

/**
 * Handles new object literals by adding them as a new node in the AST,
 * initialized with an empty object.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_objStart = function(token) {
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
Parser.prototype._handle_objVal = function(ast) {
	this._cursor.value[this._curObjKey] = ast;
};

/**
 * Handles traditional subexpressions, delineated with the groupStart and
 * groupEnd elements.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
Parser.prototype._handle_subExpression = function(ast) {
	this._placeAtCursor(ast);
};

/**
 * Handles a completed alternate subexpression of a ternary operator.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
Parser.prototype._handle_ternaryEnd = function(ast) {
	this._cursor.alternate = ast;
};

/**
 * Handles a completed consequent subexpression of a ternary operator.
 * @param {{type: <string>}} ast The subexpression tree
 * @private
 */
Parser.prototype._handle_ternaryMid = function(ast) {
	this._cursor.consequent = ast;
};

/**
 * Handles the start of a new ternary expression by encapsulating the entire
 * AST in a ConditionalExpression node, and using the existing tree as the
 * test element.
 * @param {{type: <string>}} token A token object
 * @private
 */
Parser.prototype._handle_ternaryStart = function(token) {
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
Parser.prototype._handle_transform = function(token) {
	this._placeBeforeCursor({
		type: 'Transform',
		name: token.value,
		args: [],
		subject: this._cursor
	});
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
 * subParser and setting the subMarker, a number used to determine how many
 * balance levels deep the subexpression started.
 * @param {number} balance The balance at which to place the marker
 * @private
 */
Parser.prototype._startSubExpression = function(balance) {
	var exprPrefix = this._exprStr.substr(0, this._exprStr.length - 1);
	this._subParser = new Parser(exprPrefix);
	this._subMarker = balance;
};

module.exports = Parser;
