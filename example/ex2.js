var MicroDi = require('../');
var ConfigLoader = require('node-config-loader');

function ConsoleTransport(options) {
    this._prefix = options.prefix;
    this._reqQuery = null;
}

ConsoleTransport.prototype.write = function (message) {
    console.log(this._prefix + ', ' + this._reqQuery + ': ' + message);
};

ConsoleTransport.prototype.setReq = function (req) {
    this._reqQuery = req.query;
};

function Logger(options) {
    this._helper = options.helper;
    this._transports = options.transports;
    this._prefix = options.prefix;
}

Logger.prototype.log = function (message) {
    this._transports.console.write(this._helper(this._prefix + ': ' + message));
};

function Helper(value, text) {
    return function (message) {
        return message + ', helper: ' + value + ', ' + text;
    };
}

var modules = {
    App: {
        Transport: {
            Console: ConsoleTransport
        },
        Logger: Logger,
        Helper: Helper
    }
};


var builder = MicroDi({env: 'dev'})
    .addConfig(modules);

ConfigLoader({env: 'dev'})
	.addConfigPath(__dirname + '/config')
	.load(function (config) {
		builder.addConfig(config);
	});

var container = builder.getContainer();

var req = {
    query: 'test query'
};

container.getByTag('req').forEach(function (service) {
    service.setReq(req);
});

var logger = container.get('app.logger');
logger.log('message');
//console-prefix, test query: logger-prefix: message, helper: helper value, helper text
