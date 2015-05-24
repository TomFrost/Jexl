j = require('./lib/Jexl')

j.eval("(foo, bar, baz)").then =>
	console.log arguments
.catch =>
	console.log arguments
