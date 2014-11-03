'use strict';
var packageJson = require('../package.json');
var http = require('http');
var express = require('express');
var morgan = require('morgan');
var nodePath = require('path');
var domv = require('domv');
var P = require('bluebird');

var config = require('./server-config.js');
var primusServer = require('./primus-server');

var BaseDocument = require('./view/BaseDocument');
var ClientContext = require('./ClientContext');
var FrontController = require('./controller/FrontController');
var router = require('./controller/router');
var resources = require('./resource/server');

function staticFile(app, url, path)
{
        app.use(url, function(req, res)
        {
                res.sendFile(nodePath.resolve(__dirname + '/../' + path), {
                        lastModified: true,
                        maxAge      : '7d'
                });
        });
}

function errorRequest(err, req, res, next)
{
        console.error(err.stack, '\n');
        res.header('Content-Type', 'text/plain; charset=UTF-8');
        res.status(500);
        res.send(err.stack);
        next();
}

function serverInitialize(config)
{
        var model = {}; // todo mongodb?
        var app = express();
        var server = http.createServer(app);
        var primus = primusServer(server);
        var contextResources = resources(null, model); // These Resource objects are used for the server to make request for its own controllers
        var document = domv.createHtmlDomDocument(true);

        app.set('x-powered-by', false);
        app.use(morgan('short'));
        staticFile(app, '/bundle.css', 'generated-web/bundle.css');
        staticFile(app, '/bundle.js', 'generated-web/bundle.js');
        //staticFile(app, '/favicon.ico', 'lib/view/style/favicon.ico');

        app.use(function controllerRequest(req, res)
        {
                var context = new ClientContext(true, router, new BaseDocument(document, router), contextResources);
                var front = new FrontController(context);
                var states = context.router.parse(req.url);

                front.state(states)
                        .then(function()
                        {
                                if (states[0] === '404')
                                {
                                        res.statusCode = 404;
                                }

                                context.document.sendResponseAsHtml(res);
                        })
                        .catch(function(err)
                        {
                                errorRequest(err, req, res, function(){});
                        })
                        .done();
        });

        app.use(errorRequest);

        primus.on('connection', function(spark)
        {
                spark.resources = resources(spark, model);
        });

        return P.resolve({
                server: server,
                primus: primus
        });
}

function startServer()
{
        process.title = packageJson.name + ' ' + packageJson.version;

        serverInitialize(config)
                .then(function(initialized)
                {
                        initialized.server.listen(
                                config.listenPort,
                                config.listenHostname
                        );

                        console.log(packageJson.name + ' ' + packageJson.version +
                                    ' server running at http://' +
                                    config.listenHostname +
                                    ':' +
                                    config.listenPort +
                                    '/');
                }).done();
}

module.exports = serverInitialize;
if (require.main === module)
{
        startServer();
}