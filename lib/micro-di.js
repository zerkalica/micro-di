var MicroDi,
	proto;

function isObject(val) {
	return (typeof val === 'object');
}

function isString(val) {
	return (Object.prototype.toString.call(val) === '[object String]');
}

function isArray(val) {
	return Array.isArray(val);
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

var ServiceRecursiveCallException = function (serviceName) {
	this.name = 'ServiceRecursiveCallException';
	this.message = 'Recursive dependencies with ' + serviceName + ' service';
};
proto = ServiceRecursiveCallException.prototype;
proto = new Error();
proto.constructor = ServiceRecursiveCallException;

var ServiceNotConfiguredException = function (serviceName) {
	this.name = 'ServiceNotConfiguredException';
	this.message = 'Service ' + serviceName + ' is not cofigured';
};
proto = ServiceNotConfiguredException.prototype;
proto = new Error();
proto.constructor = ServiceNotConfiguredException;

var VariableDefinedException = function (key) {
	this.name = 'VariableDefinedException';
	this.message = 'Variable ' + key + ' already defined in scope';
};
proto = VariableDefinedException.prototype;
proto = new Error();
proto.constructor = VariableDefinedException;

var MicroDiAlreadyInitialized = function (key) {
	this.name = 'MicroDiAlreadyInitialized';
	this.message = 'Container already initialized,  addConfig or addVariables before fist get';
};
proto = MicroDiAlreadyInitialized.prototype;
proto = new Error();
proto.constructor = MicroDiAlreadyInitialized;

MicroDi = function (config) {
	this.name = 'MicroDi';
	this.services = {};
	this.buildLocks = {};
	this.mapVariables = {};
	this.config = config || {};
	this._mapVariablesExplained = false;
};

proto = MicroDi.prototype;

proto.addConfig = function (config) {
	if (this._mapVariablesExplained) {
		throw new MicroDiAlreadyInitialized();
	}

	for (var ns in config) {
		//@TODO: clone
		this.config[ns] = config[ns];
	}
};

proto.addVariables = function (variables) {
	var key;
	if (this._mapVariablesExplained) {
		throw new MicroDiAlreadyInitialized();
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

	if (isString(configValue)) {
		result = this.convertPropertyStringValue(configValue);
	} else if (isArray(configValue)) {
		result = configValue.map(this.convertPropertyValue.bind(this));
	} else if (isObject(configValue)) {
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
	return mapString(string, this.mapVariables);
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
		throw new ServiceNotConfiguredException(serviceName);
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
			throw new ServiceRecursiveCallException(serviceName);
		}
		if (!this.config[serviceName]) {
			throw new ServiceNotConfiguredException(serviceName);
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
