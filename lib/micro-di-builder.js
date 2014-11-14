var proto;
var traverse = require('traverse');
var HyperConfig = require('hyper-config');
var MicroDiContainer = require('./micro-di-container');
var Exceptions = require('./exceptions');
var baseTypes = ['class', 'factory', 'static'];

var defaultScopeDefs = {
	'process': {deps: null, tags: []},
	'req': {deps: 'process', tags: ['req', 'res']}
};

/**
 * MicroDi builder
 * 
 * @param {object} options scopeDefs
 */
function MicroDiBuilder(options) {
	this.name = 'MicroDiBuilder';
	if (!(this instanceof MicroDiBuilder)) {
		return new MicroDiBuilder(options);
	}
	options = options || {};
	this._config = HyperConfig(options);
	
	baseTypes.forEach(function (key) {
		this._config.addNormalizer(key, this._extractProto.bind(this, key));
	}.bind(this));
	this._buildedConfig = null;
	this._lastInstanceId = 1;
	this._scopeDeps = {};
	this._tagToScopeMap = {};
	this._annotationLabel = options.annotationLabel || '@';
	var defs = options.scopeDefs || defaultScopeDefs;
	for (var scope in defs) {
		var def = defs[scope];
		this._scopeDeps[scope] = def.deps;
		def.tags.forEach(function addTagToObject(tag) {
			this._tagToScopeMap[tag] = scope;
		}.bind(this));
	}
}
MicroDiBuilder.Exceptions = Exceptions;

proto = MicroDiBuilder.prototype;

proto._extractProto = function _prepareCommand(key, acc, val, obj) {
	var prevScope, prevPath, currentScope, currentPath, i, j;
	var node = obj.parent.node;
	var al = this._annotationLabel;
	var path = obj.path.slice(0, obj.path.length - 1);
	if (!node[al + 'instanceId']) {
		node[al + 'instanceId'] = this._lastInstanceId;
		node[al + 'type'] = key;
		if (!acc.scopes) {
			acc.scopes = {};
		}

		currentScope = node[al + 'scope'] || this._getScopeFromTags(node[al + 'tags'] || []);

		node[al + 'scope'] = acc.scopes[path.join('.')] = currentScope;

		for(i = 0, j = path.length; i < j; i++) {
			currentPath = path.slice(0, i + 1).join('.');

			currentScope = acc.scopes[currentPath];
			if (currentScope) {
				Exceptions.ScopeNotRegistered.ok(this._scopeDeps[currentScope] !== undefined, {scope: currentScope});
				Exceptions.CantAccessScope.ok(
					!prevScope ||
					prevScope === currentScope || // если scope не изменился - все ок
					currentScope === this._scopeDeps[prevScope], // если текущий scope не числится в зависимостях prevScope - все ок
					// переход req->default допустим, default->req - нет
					// this._scopeDeps['req']: 'default', currentScope: 'default'
					// this._scopeDeps['default']: null, currentScope: 'req'
					{
						currentScope: currentScope,
						currentPath: currentPath,
						prevScope: prevScope,
						prevPath: prevPath
					}
				);
				prevScope = currentScope;
				prevPath = currentPath;
			}
		}

		this._lastInstanceId++;
	}
};

proto._getScopeFromTags = function (tags) {
	for (var i = 0, j = tags.length; i < j; i++) {
		var scope = this._tagToScopeMap[tags[i]];
		if (scope) {
			return scope;
		}
	}

	return 'process';
};

proto.addConfig = function addConfig(config) {
	this._config.addConfig(config);

	return this;
};

/**
 * Build di container
 *
 * @return {Function} microdi.get
 * @return {Function} microdi.getByTag
 */
proto.getContainer = function getContainer() {
	if (!this._buildedConfig) {
		var container = {};
		container[this._annotationLabel + 'class'] = MicroDiContainer;
		this.addConfig({microdi: {setContext: container}});
		this._buildedConfig = this._config.build();
	}
	var selfInstanceId = this._buildedConfig.get('microdi.setContext')[this._annotationLabel + 'instanceId'];

	return new MicroDiContainer({
		annotationLabel: this._annotationLabel,
		selfInstanceId: selfInstanceId,
		baseTypes: baseTypes,
		config: this._buildedConfig
	});
};

module.exports = MicroDiBuilder;
