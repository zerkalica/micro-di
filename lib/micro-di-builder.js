var proto;
var HyperConfig = require('./hyper-config');
var MicroDiContainer = require('./micro-di-container');

function MicroDiBuilder(options) {
	this.name = 'MicroDiBuilder';
	if (!(this instanceof MicroDiBuilder)) {
		return new MicroDiBuilder(options);
	}
	options = options || {};
	this._config = HyperConfig();
	this._modules = {};
	this._buildedConfig = null;
}
MicroDiBuilder.Container = MicroDiContainer;

proto = MicroDiBuilder.prototype;

proto.addConfig = function addConfig(config) {
	this._config.addConfig(config);

	return this;
};

proto.addModules = function addModules(modulesHash) {
	for(var name in modulesHash) {
		if (this._modules[name]) {
			throw new ReferenceError('Redefining module ' + name);
		}
		this._modules[name] = modulesHash[name];
	}

	return this;
};

proto.build = function build() {
	this._buildedConfig = this._config.build();
	return this;
};

/**
 * Build di container
 *
 * @return {Function} microdi.get
 * @return {Function} microdi.getByTag
 */
proto.getContainer = function getContainer() {
	var microDi = new MicroDiBuilder.Container({
		modules: this._modules,
		config: this._buildedConfig
	});

	return microDi.get.bind(microDi);
};

module.exports = MicroDiBuilder;
