/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

/**
 * A map of all expression elements to the character that represents
 * each in an expression string.  Note that changes to these may
 * require changes to the Lexer, as it tracks which needs to be regexaped
 * in a RegEx string, which have longer character length than others,
 * etc.
 * @type {{}}
 */
exports.elements = {
	identTraverse: {str: '.'},
	filterStart: {str: '['},
	filterEnd: {str: ']'},
	transformStart: {str: '|'},
	transformArgsStart: {str: '{'},
	transformArgsEnd: {str: '}'},
	transformKeyValSep: {str: ':'},
	transformKeyValPairSep: {str: ','},
	groupStart: {str: '('},
	groupEnd: {str: ')'},
	binOpAddConcat: {str: '+', type: 'binaryOp', weight: 30,
		eval: function(left, right) { return left + right; }},
	binOpSub: {str: '-', type: 'binaryOp', weight: 30,
		eval: function(left, right) { return left - right; }},
	binOpMult: {str: '*', type: 'binaryOp', weight: 40,
		eval: function(left, right) { return left * right; }},
	binOpDiv: {str: '/', type: 'binaryOp', weight: 40,
		eval: function(left, right) { return left / right; }},
	binOpMod: {str: '%', type: 'binaryOp', weight: 50,
		eval: function(left, right) { return left % right; }},
	binOpPow: {str: '^', type: 'binaryOp', weight: 50,
		eval: function(left, right) { return Math.pow(left, right); }},
	binOpCmpEq: {str: '==', type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left == right; }},
	binOpCmpNeq: {str: '!=', type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left != right; }},
	binOpCmpGt: {str: '>', type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left > right; }},
	binOpCmpGte: {str: '>=', type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left >= right; }},
	binOpCmpLt: {str: '<', type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left < right; }},
	binOpCmpLte: {str: '<=', type: 'binaryOp', weight: 20,
		eval: function(left, right) { return left <= right; }},
	binOpLogicAnd: {str: '&&', type: 'binaryOp', weight: 10,
		eval: function(left, right) { return left && right; }},
	binOpLogicOr: {str: '||', type: 'binaryOp', weight: 10,
		eval: function(left, right) { return left || right; }},
	unOpNegate: {str: '!', type: 'unaryOp', weight: 60,
		eval: function(right) { return !right; }}
};

/**
 * A map of element strings to their names; in many cases, {@link #elements}
 * with flipped keys and values.  If more than one element is represented by
 * the same character or string, then that string will be mapped to the last
 * defined value in the elements map.
 * @type {{}}
 */
exports.elementNames = {};

for (var key in exports.elements) {
	if (exports.elements.hasOwnProperty(key))
		exports.elementNames[exports.elements[key].str] = key;
}
