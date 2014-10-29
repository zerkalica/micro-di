var proto;

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
	this._prototypes = options.prototypes;
	this._instances = {};
}
proto = MicroDiContainer.prototype;

proto._getService = function _getService(params) {
	var Service;
	var isFactory = !!params['@factory'];
	var isStatic  = !!params['@static'];

	if (typeof params['@factory'] === 'object') {
		Service = this._convertPropertyValue(params['@factory']);
	} else {
		Service = this._prototypes[params['@instanceId']];
	}
	if (!Service) {
		throw new Error('Service ' + JSON.stringify(params) + ' not found');
	}
	if (isStatic) {
		return Service;
	}

	if (typeof Service !== 'function') {
		throw new Error('Service ' + JSON.stringify(params) + ' not found');
	}

	var service;
	var argsObject = this._convertPropertyValue(params, true);
	var argsInjectionType = params['@inject'] || 'object';
	if (argsInjectionType === 'object') {
		service = isFactory ? Service(argsObject) : new Service(argsObject);
	} else if (argsInjectionType === 'arguments') {
		var args = [];
		var argNames = Service.toString()
			.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg,'')
			.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
			.split(/,/);
		for (var i = 0, j = argNames.length; i < j; i++) {
			args.push(argsObject[argNames[i]]);
		}
		service = isFactory ? Service.apply(null, args) : construct(Service, args);
	} else if (argsInjectionType === 'props') {
		for(var prop in argsObject) {
			service[prop] = argsObject[prop];
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
