var traverse = require('traverse');

function merge(dest, src, isCheckOverwrite) {
	var acc = traverse(dest);
	traverse(src).forEach(function (val) {
		if (Array.isArray(val) || typeof val !== 'object') {
			if (val === '@disable' && this.path.length > 1) {
				var keyPath = this.path.slice(0);
				var key = keyPath.pop();
				delete acc.get(keyPath)[key];
			} else {
				acc.set(this.path, val);
			}
		}
	});

	return acc.value;
}

module.exports = merge;
