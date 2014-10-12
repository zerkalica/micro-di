var proto,
	e = require('./exceptions'),
	pathway = require('./pathway');

function isService(params) {
	return params['@class'] || params['@factory'] || params['@static'];
}
function mapString(string, map) {
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

function MicroDi(options) {
	this.name = 'MicroDi';
	options = options || {};
	this._cache = {};
	this._buildLocks = {};

	this._config = options.config || {};
	var variables = options.variables || {};

	this._mapVariables = {};
	for (var varName in variables) {
		this._mapVariables[varName] = this._explainString(variables[varName]);
	}
	this._modules = options.modules || {};
}
proto = MicroDi.prototype;

proto._explainString = function MicroDi__explainString(string) {
	return mapString(string, this._mapVariables);
};

proto._getService = function MicroDi__getService(params, paramsPath) {
	var service;
	var path = params['@class'] || params['@factory'] || params['@static'];
	if (!path) {
		throw new Error('This is not a service');
	}
	var isFactory = !!params['@factory'];
	var isStatic = !!params['@static'];

	delete params['@class'];
	delete params['@factory'];
	delete params['@static'];
	var Service = pathway(this._modules, path);
	if (!Service) {
		throw new Error('Service ' + path + ' not found');
	}
	var args = this._convertPropertyValue(params, paramsPath, true);
	service = isFactory ? Service(args) : (isStatic ? Service : new Service(args));

	return service;
};

proto._convertPropertyValue = function MicroDi__convertPropertyValue(configValue, serviceName, noCheckLock) {
	var result;
	if (this._cache[serviceName]) {
		return this._cache[serviceName];
	}
	if (!noCheckLock && this._buildLocks[serviceName]) {
		throw new Error(serviceName);
	}
	this._buildLocks[serviceName] = true;

	if (typeof configValue === 'string') {
		result = configValue.indexOf('@') === 0 ? this.get(configValue.substring(1)) : configValue;
	} else if (Array.isArray(configValue)) {
		result = [];
		for (var i = 0, j = configValue.length; i < j; i++) {
			result.push(this._convertPropertyValue(configValue[i], serviceName + '.' + i));
		}
	} else if (typeof configValue === 'object') {
			if (isService(configValue)) {
				console.log(serviceName);
				result = this._getService(configValue, serviceName);
			} else {
				result = {};
				for (var prop in configValue) {
					result[prop] = this._convertPropertyValue(configValue[prop], serviceName + '.' + prop);
				}
			}
	} else {
		//console.warn('Strange value ', configValue);
		result = configValue;
	}

	this._buildLocks[serviceName] = false;
	this._cache[serviceName] =  result;

	return result;
};

proto.get = function MicroDi_get(serviceName) {
	return this._convertPropertyValue(pathway(this._config, serviceName), serviceName);
};

module.exports = MicroDi;
