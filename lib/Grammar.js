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
	'[': {type: 'openBracket'},
	']': {type: 'closeBracket'},
	'|': {type: 'pipe'},
	'{': {type: 'openCurl'},
	'}': {type: 'closeCurl'},
	':': {type: 'colon'},
	',': {type: 'comma'},
	'(': {type: 'openParen'},
	')': {type: 'closeParen'},
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
	'!': {type: 'unaryOp', weight: 60,
		eval: function(right) { return !right; }}
};
