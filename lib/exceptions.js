var e = {};

function inherit (e) {
	var proto;

	proto = e.prototype;
	proto = new Error();
	proto.constructor = e;

	return e;
}

e.ServiceRecursiveCallException = inherit(function (serviceName) {
	this.name = 'ServiceRecursiveCallException';
	this.message = 'Recursive dependencies with ' + serviceName + ' service';
});

e.ServiceNotConfiguredException = inherit(function (serviceName) {
	this.name ='ServiceNotConfiguredException';
	this.message = 'Service ' + serviceName + ' is not cofigured';
});

e.ConfigSectionAlreadyDefinedException = inherit(function (key) {
	this.name = 'ConfigSectionAlreadyDefinedException';
	this.message = 'Config section ' + key + ' already defined in scope';
});

e.VariableAlreadyDefinedException = inherit(function (key) {
	this.name = 'VariableAlreadyDefinedException';
	this.message = 'Variable ' + key + ' already defined in scope';
});

e.MicroDiAlreadyInitializedException = inherit(function (key) {
	this.name = 'MicroDiAlreadyInitializedException';
	this.message = 'Container already initialized,  addConfig or addVariables before fist get';
});

e.ContainerNotFreezedException = inherit(function (key) {
	this.name = 'ContainerNotFreezedException';
	this.message = 'Call microDi.freeze() before first get';
});

module.exports = e;
