Stream = require('stream').Stream
j = require('./lib/Jexl')

# Readable = require('stream').Readable
# util = require('util')

# ReadStream = (data) ->
# 	Readable.call(this, {objectMode: true})
# 	@data = data
# 	@curIndex = 0

# util.inherits(ReadStream, Readable)

# ReadStream::_read = ->
# 	if (@curIndex == @data.length)
# 		return @push(null);
# 	data = @data[@curIndex++]
# 	@push(data);

# x = new ReadStream([12,3,4])


# str = j.eval('x <| @ + 5 |> <| @ / 3 |>', {x: [1,2,3,4]}).then(console.log)

j.addTransform 'sum', (x, y, z) ->
	x + y + z

j.eval('5 | sum(2, 3)').then =>
	console.log(arguments)
.catch =>
	console.log(arguments)
