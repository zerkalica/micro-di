# Micro DI

Config-based dependency injection container for node.js, inspired by Symfony2 (PHP) and Spring (Java).

## Usage

``` yaml
# ./config/ex2.all.yml
app:
    console-transport:
        @class: @App.Transport.Console
        @tags: [req]
        prefix: console-prefix
    logger:
        @class: @App.Logger
        helper:
            @factory: @App.Helper
            @inject: arguments
            text: 'helper text'
            value: 'helper value'
        transports:
            console: @app.console-transport
        prefix: logger-prefix
```

``` javascript
var MicroDi = require('micro-di');
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

var microDi = MicroDi();

ConfigLoader({env: 'dev', project: 'app1'})
    .addConfigPath(__dirname + '/config')
    .load(function (config) {
        microDi.addConfig(config);
    });

microDi.addConfig(modules);

var container = microDi.getContainer();

var req = {
    query: 'test query'
};

container.getByTag('req').forEach(function (service) {
    service.setReq(req);
});

var logger = container.get('app.logger');
logger.log('message');
//console-prefix, test query: logger-prefix: message, helper: helper value, helper text
```
