var omit = {},
	EventEmitter = require('events').EventEmitter;

/**
 * The SubProcessor iteratively applies a subprocess over an object. Subclasses
 * of SubProcessor handle different subprocesses.
 * @param {{@link Evaluator}} [evaluator] The evaluator invoking the subprocess.
 * @param {{}} [expr] The expression tree to run against each value.
 * @param {{}} [obj] An object over which to apply a subexpression.
 * @constructor
 */
function SubProcessor(evaluator, expr, obj) {
	this.evaluator = evaluator;
	this.expr = expr;
	this.obj = obj;
	this._extant = 0;
	this._pending = true;
	if (this.obj instanceof EventEmitter)
		this.processEmitter();
	else if (Array.isArray(this.obj))
		this.processArray();
	else
		this.processObject();
};

/**
 * Applies a suboperation once given a value and a key. Within the context of the
 * subprocess the '@' identifier refers to the value, the '#' identifier refers
 * to the numeric index if the subject is an array or the string key otherwise,
 * and the '~' identifier indicates that a result for this suboperation should be
 * omitted.
 *
 * @param {{}} [val] A value over which the suboperation is applied.
 * @param {{}} [key] The key representing the value in the object.
 * @returns {Promise<{}>} resolves when the supoperation has completed.
 */
SubProcessor.prototype.subOp = function(val, key) {
	var self = this,
		evalInst = this.evaluator.clone(),
		context = {'@': val, '#': key, '~': omit};
	this._extant++;
	Object.keys(evalInst._context).forEach(function(k) {
		if (!(k in context))
			context[k] = evalInst._context[k];
	});
	evalInst._context = context;
	return evalInst.evalLazy(this.expr).then(function(res) {
		if (res !== omit)
			self.onData(res, key);
		if (!(--self._extant || self._pending))
			self.onEnd();
	}, this.onErr);
};

/**
 * Applies processing logic for when the supplied object is an EventEmitter. Keys
 * are numeric indices reflecting the order of 'data' events. On 'end' and 'error'
 * events, the listener is removed.
 */
SubProcessor.prototype.processEmitter = function() {
	var self = this,
		idx = 0;
	listener = function(data) {
		self.subOp(data, idx++);
	};
	this.removeListener = this.obj.removeListener.bind(this.obj, 'data', listener);
	this.obj.on('data', listener);
	this.obj.on('error', function(err) {
		self.removeListener();
		self.onErr(err);
	});
	this.obj.on('end', function() {
		self._pending = false;
		self.removeListener();
		if (!self._extant)
			self.onEnd();
	});
};

/**
 * Sets the prototype and constructor properties of a subclass of SubProcessor.
 */
SubProcessor.subClass = function(ctor) {
	ctor.prototype = Object.create(SubProcessor.prototype);
	ctor.prototype.constructor = ctor;
};

/**
 * The Collector handles a Collect process.
 * @param {{@link Evaluator}} [evaluator] The evaluator invoking the Collect.
 * @param {{}} [expr] The expression tree to run against each value.
 * @param {{}} [obj] An object over which to apply a Collect process.
 * @constructor
 */
function Collector(evaluator, expr, obj) {
	SubProcessor.call(this, evaluator, expr, obj);
};

SubProcessor.subClass(Collector);

/**
 * When the object being processed is an EventEmitter, the result is an EventEmitter.
 */
Collector.prototype.processEmitter = function() {
	this._initEmitterResult();
	SubProcessor.prototype.processEmitter.call(this);
};

/**
 * When the object being processed is an Array, the result is an EventEmitter.
 */
Collector.prototype.processArray = function() {
	this._initEmitterResult();
	this.obj.map(this.subOp, this);
	this._pending = false;
};

/**
 * Other objects are processed such that their result is a promise which resolves with
 * an object mapping the keys of the supplied object to the nonomitted results of the
 * subexpression.
 */
Collector.prototype.processObject = function() {
	var self = this,
		result = {};
	this.onData = function(val, key) {
		result[key] = val;
	};
	this.result = new Promise(function(resolve, reject) {
		self.onErr = reject;
		self.onEnd = resolve.bind(Promise, result);
		Object.keys(self.obj).forEach(function(key) {
			self.subOp(self.obj[key], key);
		});
		self._pending = false;
	});
};

/**
 * Initialize an EventEmitter which emits 'data' events with the nonomitted results of the
 * subexpression, 'error' events on failed subexpressions, an 'end' event when the Collect is
 * complete, and set that EventEmitter as the result.
 */
Collector.prototype._initEmitterResult = function() {
	var emitter = new EventEmitter;
	this.onData = function(val) {
		emitter.emit('data', val);
	};
	this.onErr = emitter.emit.bind(emitter, 'error');
	this.onEnd = emitter.emit.bind(emitter, 'end');
	this.result = emitter;
};

/**
 * The Finder handles a Find process. The result of a find expression is a Promise which
 * resolves with the first nonomitted truthy result of a suboperation.
 * @param {{@link Evaluator}} [evaluator] The evaluator invoking the Find.
 * @param {{}} [expr] The expression tree to run against each value.
 * @param {{}} [obj] An object over which to apply a Find process.
 * @constructor
 */
function Finder(evaluator, expr, obj) {
	var self = this;
	this.result = new Promise(function(resolve, reject) {
		self.onErr = reject;
		self.onEnd = resolve.bind(null, undefined);
		self.onData = function(val) {
			if (!val)
				return;
			self._pending = false;
			resolve(val);
			self.removeListener && self.removeListener();
		};
	});
	SubProcessor.call(this, evaluator, expr, obj);
};

SubProcessor.subClass(Finder);

/**
 * Process an array by setting a getKey function on the Finder which returns valid indices
 * of the array, then calling next to begin the first suboperation.
 */
Finder.prototype.processArray = function() {
	var idx = -1;
	this.getKey = function() {
		return (++idx < this.obj.length) ? idx : undefined;
	};
	this.next();
};

/**
 * Process other objects by setting a getKey function which returns keys of the object, then
 * calling next to begin the first suboperation.
 */
Finder.prototype.processObject = function() {
	this.getKey = Object.keys(this.obj).shift;
	this.next();
};

/**
 * Iteratively apply a suboperation. Suboperations are lazy in that subsequent suboperations
 * are only attempted if the prior suboperation has resolved.
 */
Finder.prototype.next = function() {
	if (!(this._pending))
		return;
	var key = this.getKey();
	if (typeof key !== 'undefined')
		return this.subOp(this.obj[key], key).then(this.next.bind(this));
	this._pending = false;
	return this.onEnd();
};

module.exports.Collect = Collector;
module.exports.Find = Finder;
