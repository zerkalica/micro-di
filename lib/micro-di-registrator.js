var proto,
	merge   = require('./merge'),
	MicroDi = require('./micro-di');

function MicroDiRegistrator(options) {
	this.name = 'MicroDiRegistrator';
	if (!(this instanceof MicroDiRegistrator)) {
		return new MicroDiRegistrator(options);
	}
	options = options || {};
	this._separator = options.separator || '$';
	this._config = {};
	this._modules = {};
	this._isCheckOverwrite = true;
}
proto = MicroDiRegistrator.prototype;

proto.addConfig = function MicroDiRegistrator_addConfig(config) {
	merge(this._config, config, this._isCheckOverwrite);
	return this;
};

proto.addModules = function MicroDiRegistrator_addModules(modulesHash) {
	for(var name in modulesHash) {
		if (this._modules[name]) {
			throw new ReferenceError('Redefining module ' + name);
		}
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
 *
 * @return {Function} microdi.get
 * @return {Function} microdi.getByTag
 */
proto.build = function MicroDiRegistrator_build(options) {
	options = options || {};
	this._isCheckOverwrite = false;
	this.addConfig(options.config || {});

	var microDi = new MicroDi({
		modules:   this._modules,
		config:    this._config,
		separator: this._separator
	});

	return microDi.get.bind(microDi);
};

module.exports = MicroDiRegistrator;
