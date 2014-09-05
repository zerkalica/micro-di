var MicroDi,
	proto,
	e = require('./exceptions'),
	u = require('./utils');

MicroDi = function (config) {
	this.name = 'MicroDi';
	this.services = {};
	this.buildLocks = {};
	this.mapVariables = {};
	this.config = config || {};
	this._mapVariablesExplained = false;
};

proto = MicroDi.prototype;

proto.setModuleLoader = function(loader) {
	this.loadModule = loader;
};

proto.addConfig = function (config) {
	if (this._mapVariablesExplained) {
		throw new e.MicroDiAlreadyInitializedException();
	}

	for (var ns in config) {
		//@TODO: clone
		this.config[ns] = config[ns];
	}
};

proto.addVariables = function (variables) {
	var key;
	if (this._mapVariablesExplained) {
		throw new e.MicroDiAlreadyInitializedException();
	}

	for (var ns in variables) {
		key = '%' + ns + '%';
		this.mapVariables[key] = variables[ns];
		
	}
};

proto.convertPropertyStringValue = function(configValue) {
	var serviceName,
		value,
		isService = configValue.indexOf('@') === 0;

	if (isService) {
		serviceName = configValue.substring(1);
		value       = this.get(serviceName);
	} else {
		value = this.explainString(configValue);
	}

	return value;
};

proto.convertPropertyValue = function (configValue) {
	var result;

	if (u.isString(configValue)) {
		result = this.convertPropertyStringValue(configValue);
	} else if (u.isArray(configValue)) {
		result = configValue.map(this.convertPropertyValue.bind(this));
	} else if (u.isObject(configValue)) {
		result = {};
		for (var propName in configValue) {
			result[propName] = this.convertPropertyValue(configValue[propName]);
		}
	} else {
		//console.warn('Strange value ', configValue);
		result = configValue;
	}

	return result;
};

proto.convertArgs = function(params) {
	var args = {};
	for (var propertyName in params) {
		var configValue = params[propertyName];
		args[propertyName] = this.convertPropertyValue(configValue);
	}

	return args;
};

proto.explainString = function (string) {
	return u.mapString(string, this.mapVariables);
};

proto.loadConstructor = function (service, params) {
	return new service(this.convertArgs(params));
};

proto.loadMethods = function (service, params) {
	for (var methodName in params) {
		service[methodName].call(service, this.convertArgs(params[methodName]));
	}

	return service;
};

proto.loadProperties = function (service, params) {
	for (var propertyName in params) {
		service[propertyName] = this.convertArgs(params[propertyName]);
	}

	return service;
};

proto.loadModule = function (path) {
	return require(path);
};

proto.buildService = function(serviceName, params) {
	var service;

	if (!params.require) {
		throw new e.ServiceNotConfiguredException(serviceName);
	}

	service = this.loadModule(this.explainString(params.require));
	if (params.options) {
		service = this.loadConstructor(service, params.options);
	}

	if (params.properties) {
		service = this.loadProperties(service, params.properties);
	}

	if (params.methods) {
		service = this.loadMethods(service, params.methods);
	}

	return service;
};

proto._explainMapVariables = function () {
	for (var varName in this.mapVariables) {
		this.mapVariables[varName] = this.explainString(this.mapVariables[varName]);
	}
};

proto.get = function(serviceName) {
	var service, params;

	if (!this._mapVariablesExplained) {
		this._explainMapVariables();
		this._mapVariablesExplained = true;
	}

	if (this.services[serviceName]) {
		service = this.services[serviceName];
	} else {
		if (this.buildLocks[serviceName]) {
			throw new e.ServiceRecursiveCallException(serviceName);
		}
		if (!this.config[serviceName]) {
			throw new e.ServiceNotConfiguredException(serviceName);
		}
		params = this.config[serviceName];

		this.buildLocks[serviceName] = true;
		service = this.buildService(serviceName, params);
		this.buildLocks[serviceName] = false;
		this.services[serviceName] =  service;
	}

	return service;
};

proto.getByTag = function(tagName) {
	var result = [];
	for (var serviceName in this.config) {
		var serviceConfig = this.config[serviceName];
		if (serviceConfig.tag && serviceConfig.tag === tagName) {
			result.push(this.get(serviceName));
		}
	}

	return result;
};

module.exports = MicroDi;
