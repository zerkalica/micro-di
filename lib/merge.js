var traverse = require('traverse');

function merge(dest, src, isCheckOverwrite) {
	var acc = traverse(dest);
	traverse(src).forEach(function (val) {
		if (Array.isArray(val) || typeof val !== 'object') {
			acc.set(this.path, val);
		}
	});

	return acc.value;
}

module.exports = merge;
