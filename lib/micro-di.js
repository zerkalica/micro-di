var proto,
	e = require('./exceptions'),
	u = require('./utils')
	pathway = require('./pathway');

function isService(params) {
	return params['@class'] || params['@factory'] || params['@static'];
}

function MicroDi(options) {
	this.name = 'MicroDi';
	options = options || {};
	this._services = {};
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

proto._convertPropertyStringValue = function MicroDi__convertPropertyStringValue(configValue) {
	var serviceName,
		value     = this._explainString(configValue),
		isService = configValue.indexOf('@') === 0 && configValue.indexOf('@@') !== 0;

	if (isService) {
		serviceName = value.substring(1);
		value       = this.get(serviceName);
	}

	return value;
};

proto._explainString = function MicroDi__explainString(string) {
	return u.mapString(string, this._mapVariables);
};

proto._getService = function MicroDi__getService(params) {
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
	var args = this._convertPropertyValue(params);
	service = isFactory ? Service(args) : (isStatic ? Service : new Service(args));

	return service;
};

proto._convertPropertyValue = function MicroDi__convertPropertyValue(configValue) {
	var result;

	if (u.isString(configValue)) {
		result = this._convertPropertyStringValue(configValue);
	} else if (u.isArray(configValue)) {
		result = configValue.map(this._convertPropertyValue.bind(this));
	} else if (isService(configValue)) {
		result = this._getService(configValue);
	} else if (u.isObject(configValue)) {
		result = {};
		for (var prop in configValue) {
			result[prop] = this._convertPropertyValue(configValue[prop]);
		}
	} else {
		//console.warn('Strange value ', configValue);
		result = configValue;
	}

	return result;
};

proto.get = function MicroDi_get(serviceName) {
	var service, params;
	if (this._services[serviceName]) {
		service = this._services[serviceName];
	} else {
		if (this._buildLocks[serviceName]) {
			throw new e.ServiceRecursiveCallException(serviceName);
		}
		this._buildLocks[serviceName] = true;
		params  = pathway(this._config, serviceName);
		if (typeof params !== 'object') {
			throw new e.ServiceNotConfiguredException(serviceName);
		}
		service = this._convertPropertyValue(params);
		this._buildLocks[serviceName] = false;
		this._services[serviceName] =  service;
	}

	return service;
};

module.exports = MicroDi;
