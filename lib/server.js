'use strict';
var packageJson = require('../package.json');
var http = require('http');
var express = require('express');
var morgan = require('morgan');
var nodePath = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var domv = require('domv');
var P = require('bluebird');
var secureRandomBytes = P.promisify(require('crypto').randomBytes);

var mongoInit = require('./mongo-init');
var config = require('./server-config');
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

function getOrSetCsrfToken(req, res)
{
        if (req.cookies.csrf)
        {
                return P.resolve(req.cookies.csrf);
        }

        // secureRandomBytes() might fail if there is not entropy
        return secureRandomBytes(128).then(function(buf)
        {
                var csrf = buf.toString('base64');
                csrf = csrf.replace(/\+/g, '_');
                csrf = csrf.replace(/\//g, '-');
                res.setHeader('Set-Cookie', 'csrf=' + csrf);
                return csrf;
        });
}

function serverInitialize(config)
{
        var model = mongoInit(config);
        var app = express();
        var server = http.createServer(app);
        var primus = primusServer(server);
        var contextResources = resources(null, model, config); // These Resource objects are used for the server to make request for its own controllers
        var document = domv.createHtmlDomDocument(true);

        app.set('x-powered-by', false);
        app.use(morgan('short'));
        staticFile(app, '/bundle.css', 'generated-web/bundle.css');
        staticFile(app, '/bundle.js', 'generated-web/bundle.js');
        //staticFile(app, '/favicon.ico', 'lib/view/style/favicon.ico');

        app.use(cookieParser());

        app.use(bodyParser.urlencoded({
                extended: true
        }));

        app.use(function controllerRequest(req, res)
        {
                var context = new ClientContext(true, router, new BaseDocument(document, router), contextResources);
                var front = new FrontController(context);
                var states = context.router.parse(req.url);

                getOrSetCsrfToken(req, res).then(function(token)
                {
                        context.csrfToken = token;
                        if (req.method === 'POST')
                        {
                                context.csrfValid = req.body.csrf === context.csrfToken;
                                context.postData = req.body;
                                delete context.postData.csrf;
                        }

                }).then(function()
                {
                        return front.state(states);

                }).then(function()
                {
                        if (states[0] === '404')
                        {
                                res.statusCode = 404;
                        }

                        context.document.sendResponseAsHtml(res);

                }).catch(function(err)
                {
                        errorRequest(err, req, res, function(){});
                })
                .done();
        });

        app.use(errorRequest);

        primus.on('connection', function(spark)
        {
                spark.resources = resources(spark, model, config);
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