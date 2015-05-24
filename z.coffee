jexl = require('./lib/Jexl')

jexl.eval("foo bar", {foo: 5}).then =>
	console.log arguments
.catch =>
	console.log arguments

# jexl.eval("foo rab foo", {foo: {bar: 5}}).then =>
# 	console.log arguments
# .catch (err) =>
# 	console.log err

# jexl.eval("foo.bar", {foo: {bar: 5}}).then =>
# 	console.log arguments

# .catch (err) =>
# 	console.log err



# jexl.eval('foo = [1,2,3] | map((n) -> n + other); foo', {foo: {bar: 5}}).then =>
# 	console.log arguments
# .catch (err) =>
# 	console.log err
