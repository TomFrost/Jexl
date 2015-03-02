/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var Evaluator = require('./Evaluator'),
	Lexer = require('./Lexer'),
	Parser = require('./Parser');

/**
 * Jexl is the Javascript Expression Language, capable of parsing and
 * evaluating basic to complex expression strings, combined with advanced
 * xpath-like drilldown into native Javascript objects.
 * @constructor
 */
function Jexl() {
	this._transforms = {};
}

/**
 * Adds or replaces a transform function in this Jexl instance.
 * @param {string} name The name of the transform function, as it will be used
 *      within Jexl expressions
 * @param {function} fn The function to be executed when this transform is
 *      invoked.  It will be provided with two arguments:
 *          - {*} value: The value to be transformed
 *          - {{}} args: The arguments for this transform
 *          - {function} cb: A callback function to be called with an error
 *            if the transform fails, or a null first argument and the
 *            transformed value as the second argument on success.
 */
Jexl.prototype.addTransform = function(name, fn) {
	this._transforms[name] = fn;
};

/**
 * Syntactic sugar for calling {@link #addTransform} repeatedly.  This function
 * accepts a map of one or more transform names to their transform function.
 * @param {{}} map A map of transform names to transform functions
 */
Jexl.prototype.addTransforms = function(map) {
	for (var key in map) {
		if (map.hasOwnProperty(key))
			this._transforms[key] = map[key];
	}
};

/**
 * Retrieves a previously set transform function.
 * @param {string} name The name of the transform function
 * @returns {function} The transform function
 */
Jexl.prototype.getTransform = function(name) {
	return this._transforms[name];
};

/**
 * Evaluates a Jexl string within an optional context.
 * @param {string} expression The Jexl expression to be evaluated
 * @param {Object} [context] A mapping of variables to values, which will be
 *      made accessible to the Jexl expression when evaluating it
 * @param {function} [cb] An optional callback function to be executed when
 *      evaluation is complete.  It will be supplied with two arguments:
 *          - {Error|null} err: Present if an error occurred
 *          - {*} result: The result of the evaluation
 * @returns {Promise<*>} resolves with the result of the evaluation.  Note that
 *      if a callback is supplied, the returned promise will already have
 *      a '.catch' attached to it in order to pass the error to the callback.
 */
Jexl.prototype.eval = function(expression, context, cb) {
	if (typeof context === 'function') {
		cb = context;
		context = {};
	}
	else if (!context)
		context = {};
	var valPromise = this._eval(expression, context);
	if (cb) {
		// setTimeout is used for the callback to break out of the Promise's
		// try/catch in case the callback throws.
		var called = false;
		return valPromise.then(function(val) {
			called = true;
			setTimeout(cb.bind(null, null, val), 0);
		}).catch(function(err) {
			if (!called)
				setTimeout(cb.bind(null, err), 0);
		});
	}
	return valPromise;
};

/**
 * Evaluates a Jexl string in the given context.
 * @param {string} exp The Jexl expression to be evaluated
 * @param {Object} [context] A mapping of variables to values, which will be
 *      made accessible to the Jexl expression when evaluating it
 * @returns {Promise<*>} resolves with the result of the evaluation.
 * @private
 */
Jexl.prototype._eval = function(exp, context) {
	var parser = new Parser(),
		evaluator = new Evaluator(this._transforms, context);
	return Promise.resolve().then(function() {
		parser.addTokens(Lexer.tokenize(exp));
		return evaluator.eval(parser.complete());
	});
};

module.exports = new Jexl();
module.exports.Jexl = Jexl;
