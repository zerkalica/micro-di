# Micro DI

Config-based dependency injection container for node.js, inspired by Symfony2 (PHP) and Spring (Java).

## Features

* based on [hyper-config](https://github.com/zerkalica/hyper-config): config wrapper with merging, references, string macros, tagging, etc.
* supports annotation
* injects to constructor as options object or arguments
* can clone di container with new context (container per requests)

## Config keywords
* @class - reference to class, container creates new instance of prototype
* @factory - reference to factory function, which returns initialized object, container invoke this function and cache result
* ~path - reference, see [hyper-config](https://github.com/zerkalica/hyper-config)
* @inject - constructor injection type: object, arguments, props
* @tags - array of tags, see [hyper-config](https://github.com/zerkalica/hyper-config)

## Usage

```yaml
# ./config/ex2.all.yml
app:
    console-transport:
        @class: ~App.Transport.Console
        @tags: [req]
        prefix: console-prefix
    logger:
        @class: ~App.Logger
        @scope: req
        helper:
            @factory: ~App.Helper
            @inject: arguments
            text: helper text
            value: helper value
        transports:
            console: ~app.console-transport
        prefix: logger-prefix
```

```javascript
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


var builder = MicroDi()
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
var newContainer = container.setContext('req', {
    req: req
});

var logger = newContainer.get('app.logger');
logger.log('message');
//console-prefix, test query: logger-prefix: message, helper: helper value, helper text
```
