var MicroDi,
	proto,
	e = require('./exceptions'),
	u = require('./utils');

var MicroDiRegistrator = function (options) {
	this.name = 'MicroDiRegistrator';
	this._config = {};
	this._variables = {};
	this._isCheckOverwrite = true;
};
proto = MicroDiRegistrator.prototype;

proto.addConfig = function (config) {
	for (var ns in config) {
		if (this._isCheckOverwrite && this._config[ns]) {
			throw new e.ConfigSectionAlreadyDefinedException(ns);
		}
		this._config[ns] = config[ns];
	}

	return this;
};

proto.addVariables = function (variables) {
	for (var ns in variables) {
		var key = '%' + ns + '%';
		if (this._isCheckOverwrite && this._variables[key]) {
			throw new e.VariableAlreadyDefinedException(ns);
		}
		this._variables[key] = variables[ns];
	}

	return this;
};

/**
 * Build di container
 * 
 * @param  {Object} options Options
 * @param  {Object} options.config
 * @param  {Object} options.variables
 *
 * @return {Function} microdi.get
 * @return {Function} microdi.getByTag
 */
proto.build = function (options) {
	options = options || {};
	this._isCheckOverwrite = false;
	this.addConfig(options.config || {});
	this.addVariables(options.variables || {});

	var microDi = new MicroDi({
		config: this._config,
		variables: this._variables
	});

	return {
		get: microDi.get.bind(microDi),
		getByTag: microDi.getByTag.bind(microDi)
	};
};

MicroDi = function (options) {
	this.name = 'MicroDi';
	options = options || {};
	this.services = {};
	this.buildLocks = {};

	this.config = options.config || {};
	var variables = options.variiables || {};

	this.mapVariables = {};
	for (var varName in variables) {
		this.mapVariables[varName] = this._explainString(variables[varName]);
	}
};
proto = MicroDi.prototype;

proto.setModuleLoader = function(loader) {
	this.loadModule = loader;
};

proto._convertPropertyStringValue = function(configValue) {
	var serviceName,
		value     = this._explainString(configValue),
		isService = configValue.indexOf('@') === 0;

	if (isService) {
		serviceName = value.substring(1);
		value       = this.get(serviceName);
	} else {
		value = this._explainString(configValue);
	}

	return value;
};

proto._convertPropertyValue = function (configValue) {
	var result;

	if (u.isString(configValue)) {
		result = this._convertPropertyStringValue(configValue);
	} else if (u.isArray(configValue)) {
		result = configValue.map(this._convertPropertyValue.bind(this));
	} else if (u.isObject(configValue)) {
		result = {};
		for (var propName in configValue) {
			result[propName] = this._convertPropertyValue(configValue[propName]);
		}
	} else {
		//console.warn('Strange value ', configValue);
		result = configValue;
	}

	return result;
};

proto._convertArgs = function(params) {
	var args = {};
	for (var propertyName in params) {
		var configValue = params[propertyName];
		args[propertyName] = this._convertPropertyValue(configValue);
	}

	return args;
};

proto._explainString = function (string) {
	return u.mapString(string, this.mapVariables);
};

proto.loadModule = function (path) {
	return require(path);
};

proto._buildService = function(serviceName, params) {
	var args, service;

	if (!params) {
		throw new e.ServiceNotConfiguredException(serviceName);
	}

	service = params.require ? this.loadModule(this._explainString(params.require)) : this._convertPropertyValue(params);

	if (params.options) {
		args    = this._convertArgs(params.options);
		service = new service(args);
	}

	if (params.properties) {
		args    = this._convertArgs(params.properties);
		for (var propertyName in args) {
			service[propertyName] = args[propertyName];
		}
	}

	if (params.methods) {
		var methodName, methodArgs = [];
		for (methodName in params.methods) {
			methodArgs.push({
				name: methodName,
				args: this._convertArgs(params[methodName])
			});
		}
		methodArgs.forEach(function (method) {
			service[method.name].call(service, method.args);
		});
	}

	return service;
};

proto.get = function(serviceName) {
	var service, params;
	if (this.services[serviceName]) {
		service = this.services[serviceName];
	} else {
		if (this.buildLocks[serviceName]) {
			throw new e.ServiceRecursiveCallException(serviceName);
		}
		if (!this.config[serviceName]) {
			throw new e.ServiceNotConfiguredException(serviceName);
		}
		this.buildLocks[serviceName] = true;
		service = this._buildService(serviceName, this.config[serviceName]);
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

module.exports = MicroDiRegistrator;
