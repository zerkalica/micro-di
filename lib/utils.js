module.exports = {
	isObject: function (val) {
		return (typeof val === 'object');
	},

	isString: function (val) {
		return (Object.prototype.toString.call(val) === '[object String]');
	},

	isArray: function (val) {
		return Array.isArray(val);
	},

	mapString: function (string, map) {
		var result = string;
		for (var name in map) {
			var i = result.indexOf(name);
			if (i !== -1) {
				var value = map[name];
				result = result.substring(0, i) + value + result.substring(i + name.length);
			}
		}

		return result;
	}
};
