var proto,
	e = require('./exceptions'),
	u = require('./utils'),
	pathway = require('./pathway');

function MicroDi(options) {
	this.name = 'MicroDi';
	options = options || {};
	this.services = {};
	this.buildLocks = {};

	this.config = options.config || {};
	var variables = options.variables || {};

	this.mapVariables = {};
	for (var varName in variables) {
		this.mapVariables[varName] = this._explainString(variables[varName]);
	}
	this._modules = options.modules || {};
}
proto = MicroDi.prototype;

proto._convertPropertyStringValue = function MicroDi__convertPropertyStringValue(configValue) {
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

proto._convertPropertyValue = function MicroDi__convertPropertyValue(configValue) {
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

proto._convertArgs = function MicroDi__convertArgs(params) {
	var args = {};
	for (var propertyName in params) {
		var configValue = params[propertyName];
		args[propertyName] = this._convertPropertyValue(configValue);
	}

	return args;
};

proto._explainString = function MicroDi__explainString(string) {
	return u.mapString(string, this.mapVariables);
};

proto._loadModule = function MicroDi__loadModule(path) {
	return pathway(this._modules, path);
};

proto._buildService = function MicroDi__buildService(serviceName, params) {
	var args, service;

	if (!params) {
		throw new e.ServiceNotConfiguredException(serviceName);
	}

	service = params.class ? this._loadModule(this._explainString(params.class)) : this._convertPropertyValue(params);

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

proto.get = function MicroDi_get(serviceName) {
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

proto.getByTag = function MicroDi_getByTag(tagName) {
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
