var proto;

function getArgNames(Proto) {
	return Proto.toString()
		.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg,'')
		.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
		.split(/,/);
}

function objectToArguments(Proto, argsObject) {
	var argNames = getArgNames(Proto);
	var args = [];
	for (var i = 0, j = argNames.length; i < j; i++) {
		args.push(argsObject[argNames[i]]);
	}
	return args;
}

function construct(constructor, args) {
	function F() {
		return constructor.apply(this, args);
	}
	F.prototype = constructor.prototype;

	return new F();
}

/**
 * Micro di
 *
 * @param {Object} options.prototypes Prototypes map
 * @param {Object} options.config di config json
 */
function MicroDiContainer(options) {
	this.name = 'MicroDiContainer';
	if (!(this instanceof MicroDiContainer)) {
		return new MicroDiContainer(options);
	}
	options = options || {};
	this._config    = options.config;
	this._instances = {};
	this._types = ['factory', 'class', 'static'];
}
proto = MicroDiContainer.prototype;

proto._getService = function _getService(params) {
	var key, Proto, service;
	var argsInjectionType = params['@inject'] || 'object';
	for (var i = 0, j = this._types.length; i < j; i++) {
		key = this._types[i];
		Proto = params['@' + key];
		if (Proto) {
			break;
		}
	}

	if (typeof Proto === 'object') {
		Proto = this._convertPropertyValue(Proto);
	}

	if (!Proto) {
		throw new Error('Proto ' + JSON.stringify(params) + ' not found');
	}

	if (typeof Proto !== 'function') {
		throw new Error('Proto ' + JSON.stringify(params) + ' not found');
	}

	if (key === 'static') {
		service = Proto;
	} else {
		var argsObject = this._convertPropertyValue(params, true);
		var isFactory = key === 'factory';
		switch(argsInjectionType) {
			case 'object':
				service = isFactory ? Proto(argsObject) : new Proto(argsObject);
				break;
			case 'arguments':
				var args = objectToArguments(Proto, argsObject);
				service = isFactory ? Proto.apply(null, args) : construct(Proto, args);
				break;
			case 'props':
				service = isFactory ? Proto(argsObject) : new Proto(argsObject);
				for(var prop in argsObject) {
					service[prop] = argsObject[prop];
				}
				break;
			default:
				throw new Error('Unknown injection type: ' + argsInjectionType);
		}
	}

	return service;
};

proto._convertPropertyValue = function _convertPropertyValue(configValue, isServiceProcessing) {
	var result;

	if (Array.isArray(configValue)) {
		result = [];
		for (var i = 0, j = configValue.length; i < j; i++) {
			result.push(this._convertPropertyValue(configValue[i]));
		}
	} else if (typeof configValue === 'object') {
		var instanceId = configValue['@instanceId'];
		var instance = instanceId ? this._instances[instanceId] : null;
		if (instance) {
			result = instance;
		} else if (!isServiceProcessing && instanceId) {
			result = this._instances[instanceId] = this._getService(configValue);
		} else {
			result = {};
			for (var prop in configValue) {
				if (prop.indexOf('@') === -1) {
					if (configValue[prop] === undefined) {
						throw new Error('Can\'t resolve prop ' + prop);
					}

					result[prop] = this._convertPropertyValue(configValue[prop]);
				}
			}
		}
	} else {
		result = configValue;
	}

	return result;
};

proto.get = function get(serviceName) {
	var configValue = this._config.get(serviceName);
	if (configValue === undefined) {
		throw new ReferenceError('Config value not present in path ' + serviceName);
	}
	return this._convertPropertyValue(configValue);
};

proto.getByTag = function getByTag(tag) {
	return this._config.getByTag(tag).map(function (configValue) {
		return this._convertPropertyValue(configValue);
	}.bind(this));
};

module.exports = MicroDiContainer;
