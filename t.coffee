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

x = new ReadStream([12,3,4])


# str = j.eval('x <| @ + 5 |> <| @ / 3 |>', {x: [1,2,3,4]}).then(console.log)

str = j.stream('x <| @ + 5 |> <| @ / 3 |>', {x})

str.on 'data', (val) ->
	console.log "HWEWE"
	console.log val
