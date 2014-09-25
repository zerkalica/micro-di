var proto,
	e = require('./exceptions'),
	MicroDi = require('./micro-di');

function MicroDiRegistrator(options) {
	this.name = 'MicroDiRegistrator';
	this._config = {};
	this._modules = {};
	this._variables = {};
	this._isCheckOverwrite = true;
}
proto = MicroDiRegistrator.prototype;

proto.addConfig = function MicroDiRegistrator_addConfig(config) {
	for (var ns in config) {
		if (this._isCheckOverwrite && this._config[ns]) {
			throw new e.ConfigSectionAlreadyDefinedException(ns);
		}
		this._config[ns] = config[ns];
	}

	return this;
};

proto.addVariables = function MicroDiRegistrator_addVariables(variables) {
	for (var ns in variables) {
		var key = '%' + ns + '%';
		if (this._isCheckOverwrite && this._variables[key]) {
			throw new e.VariableAlreadyDefinedException(ns);
		}
		this._variables[key] = variables[ns];
	}

	return this;
};

proto.addModules = function MicroDiRegistrator_addModules(modulesHash) {
	for(var name in modulesHash) {
		this._modules[name] = modulesHash[name];
	}

	return this;
};

/**
 * Build di container
 * 
 * @param  {Object} options Options
 * @param  {Object} options.modules
 * @param  {Object} options.config
 * @param  {Object} options.variables
 *
 * @return {Function} microdi.get
 * @return {Function} microdi.getByTag
 */
proto.build = function MicroDiRegistrator_build(options) {
	options = options || {};
	this._isCheckOverwrite = false;
	this.addConfig(options.config || {});
	this.addVariables(options.variables || {});

	var microDi = new MicroDi({
		modules:   this._modules,
		config:    this._config,
		variables: this._variables
	});

	return {
		get: microDi.get.bind(microDi),
		getByTag: microDi.getByTag.bind(microDi)
	};
};

module.exports = MicroDiRegistrator;
