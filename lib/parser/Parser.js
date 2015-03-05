/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var e = require('../Grammar').elements,
	handlers = require('./handlers'),
	states = require('./states').states;

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
			handleFunc = handlers[token.type];
		if (typeOpts.handler)
			handleFunc = typeOpts.handler;
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
	state.subHandler.call(this, subAST);
	if (token && state.endStates)
		this._state = state.endStates[token.type];
	this._subMarker = null;
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
