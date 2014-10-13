var traverse = require('traverse');

function merge(dest, src, isCheckOverwrite) {
	var acc = traverse(dest);
	traverse(src).forEach(function (val) {
		if (Array.isArray(val) || typeof val !== 'object') {
			if (val === '@disable' && this.path.length > 1) {
				var path = this.path.splice(0, this.path.length - 2);
				var key  = this.path[this.path.length - 1];
				delete acc.get(path)[key];
			} else {
				acc.set(this.path, val);
			}
		}
	});

	return acc.value;
}

module.exports = merge;
