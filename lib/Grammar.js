/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

/**
 * A map of all expression elements to their properties. Note that changes
 * here may require changes in the Lexer or Parser.
 * @type {{}}
 */
exports.elements = {
	'.': {type: 'dot'},
	'[': {type: 'openBracket', balance: 1},
	']': {type: 'closeBracket', balance: -1},
	'|': {type: 'pipe'},
	'{': {type: 'openCurl', balance: 1},
	'}': {type: 'closeCurl', balance: -1},
	':': {type: 'colon'},
	',': {type: 'comma'},
	'(': {type: 'openParen', balance: 1},
	')': {type: 'closeParen', balance: -1},
	'+': {type: 'binaryOp', weight: 30,
		eval: function(left, right) { return left + right; }},
	'-': {type: 'binaryOp', weight: 30,
		eval: function(left, right) { return left - right; }},
	'*': {type: 'binaryOp', weight: 40,
		eval: function(left, right) { return left * right; }},
	'/': {type: 'binaryOp', weight: 40,
		eval: function(left, right) { return left / right; }},
	'//': {type: 'binaryOp', weight: 40,
		eval: function(left, right) { return Math.floor(left / right); }},
	'%': {type: 'binaryOp', weight: 50,
		eval: function(left, right) { return left % right; }},
	'^': {type: 'binaryOp', weight: 50,
		eval: function(left, right) { return Math.pow(left, right); }},
	'==': {type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left == right; }},
	'!=': {type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left != right; }},
	'>': {type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left > right; }},
	'>=': {type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left >= right; }},
	'<': {type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left < right; }},
	'<=': {type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left <= right; }},
	'&&': {type: 'binaryOp', weight: 10,
		eval: function(left, right) { return left && right; }},
	'||': {type: 'binaryOp', weight: 10,
		eval: function(left, right) { return left || right; }},
	'in': {type: 'binaryOp', weight: 20,
		eval: function(left, right) {
			if (typeof right === 'string')
				return right.indexOf(left) !== -1;
			if (Array.isArray(right)) {
				return right.some(function(elem) {
					return elem == left;
				});
			}
			return false;
		}},
	'!': {type: 'unaryOp', weight: 60,
		eval: function(right) { return !right; }}
};
