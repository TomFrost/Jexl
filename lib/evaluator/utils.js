var EventEmitter = require('events').EventEmitter;

/**
 * Consumes an EventEmitter, return a promise that resolves with an array of
 * values from each of the 'data' events after a final 'end' event.
 * @param {{EventEmitter}} emitter An instance of EventEmitter
 * @returns {Promise<{}>} resolves with an array of results;
 */
exports.consume = function(obj) {
	if (Array.isArray(obj))
		return Promise.all(obj);
	return Promise.resolve(obj).then(function(obj) {
		if (!(obj instanceof EventEmitter))
			return obj;
		return new Promise(function(resolve, reject) {
			var results = [];
			obj.on('data', results.push.bind(results));
			obj.on('error', reject);
			obj.on('end', resolve.bind(Promise, results));
		});
	});
};

exports.partialConsume = function(obj) {
	if (obj instanceof EventEmitter)
		return obj;
	return Array.isArray(obj) ? Promise.all(obj) : Promise.resolve(obj);
};

exports.stream = function(arr) {
	var emitter = new EventEmitter;
	var _stream = function() {
		if (!arr.length)
			return emitter.emit('end');
		Promise.resolve(arr.shift()).then(function(elem) {
			emitter.emit('data', elem);
			_stream();
		}, emitter.emit.bind(emitter, 'error'));
	};
	setTimeout(_stream, 0);
	return emitter;
};

exports.relay = function(emitter, fn) {
	var extant = 0,
		end = false,
		relay = new EventEmitter;
	var checkEnd = function() {
		if (!extant && end)
			relay.emit('end');
	};
	emitter.on('data', function(data) {
		extant++;
		fn(data).then(function(res) {
			relay.emit('data', res);
			extant--;
			checkEnd();
		});
	});
	emitter.on('error', relay.emit.bind(relay, 'error'));
	emitter.on('end', function() {
		end = true;
		checkEnd();
	});
	return relay;
};

exports.pending = function() {
	var deferred = {};
	deferred.promise = new Promise(function(resolve, reject) {
		deferred.resolve = resolve;
		deferred.reject = reject;
	});
	return deferred;
};
