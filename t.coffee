Stream = require('stream').Stream
j = require('./lib/Jexl')

Readable = require('stream').Readable
util = require('util')

ReadStream = (data) ->
	Readable.call(this, {objectMode: true})
	@data = data
	@curIndex = 0

util.inherits(ReadStream, Readable)

ReadStream::_read = ->
	if (@curIndex == @data.length)
		return @push(null);
	data = @data[@curIndex++]
	@push(data);

x = new ReadStream([{y: [12, 12, 12]}, {y: [3, 3, 3]}, {y: [4, 4, 4]}])

str = j.stream('y <| @ + 5|> ', x)

str.on 'data', ->
	console.log arguments

str.on 'end', ->
	console.log 'XXX'


console.log(str.pipe)

# .then(console.log)

# j.addTransform 'sum', (x, y, z) ->
# 	x + y + z

# j.eval('5 | sum(2, 3)').then =>
# 	console.log(arguments)
# .catch =>
# 	console.log(arguments)
