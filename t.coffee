j = require './lib/Jexl'

j.addTransform 'bar', (val) -> val + 5

# j.eval('foo (x, y) |= @ + x').then (res) =>
# 	console.log res
# 	console.log j._transforms
# .catch (res) =>
# 	console.log res

j.eval('foo |= @ + 5; 6 | foo').then (res) =>
	console.log res
	console.log j._transforms
.catch (res) =>
	console.log res

# j.eval('foo | bar(x, y) + 5').then (res) =>
# 	console.log res
# 	console.log j._transforms
# .catch (res) =>
# 	console.log res
