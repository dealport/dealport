'use strict';
var packageJson = require('../package.json');
var http = require('http');
var express = require('express');
var accepts = require('accepts');
var expressSession = require('express-session');
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
var passportInit = require('./passport-init');

var BaseDocument = require('./view/BaseDocument');
var ClientContext = require('./ClientContext');
var FrontController = require('./controller/FrontController');
var router = require('./controller/router');
var resources = require('./resource/server');
var MongoSessionStore = require('./MongoSessionStore');

function staticFile(path, type)
{
        path = nodePath.resolve(__dirname + '/../' + path);
        var gzPath = path + '.gz';

        return function(req, res)
        {
                var accept = accepts(req);
                var method = accept.encodings(['gzip']);

                function plain()
                {
                        res.sendFile(path, {
                                lastModified: true,
                                maxAge      : '7d',
                                headers     : {
                                        'Content-Type': type
                                }
                        });
                }

                if (method === 'gzip')
                {
                        return res.sendFile(
                                gzPath,
                                {
                                        lastModified: true,
                                        maxAge      : '7d',
                                        headers     : {
                                                'Content-Encoding': 'gzip',
                                                'Content-Type': type
                                        }
                                },
                                function(err)
                                {
                                        if (err)
                                        {
                                                plain();
                                        }
                                }
                        );
                }

                plain();
        };
}

function errorRequest(err, req, res, next)
{
        console.error(err.stack, '\n');
        res.header('Content-Type', 'text/plain; charset=UTF-8');
        res.status(500);
        res.send(err.stack);
        next();
}

function companyLogo(model, config)
{
        return function(req, res)
        {
                var contextResources = resources(null, model, config, req.user);
                contextResources.UploadedImage.companyLogoAsResponse(req.url && req.url.slice(1), res);
        };
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
                var setCookie = res.getHeader('Set-Cookie') || [];
                setCookie.push('csrf=' + csrf+'; HttpOnly');
                res.setHeader('Set-Cookie', setCookie);
                return csrf;
        });
}

function serverInitialize(config)
{
        var model = mongoInit(config);
        var app = express();
        var server = http.createServer(app);
        var primus = primusServer(server);
        var document = domv.createHtmlDomDocument(true);
        var sessionStore = new MongoSessionStore(model);

        app.set('x-powered-by', false);

        app.use(morgan('short'));
        //primus.before('morgan', morgan('short'));

        app.use('/favicon.ico', function(req, res)
        {
                res.statusCode = 404;
                res.setHeader('Content-Type' ,'text/plain; charset=UTF-8');
                res.end('404');
        });
        app.use('/bundle.css', staticFile('generated-web/bundle.css', 'text/css; charset=UTF-8'));
        app.use('/bundle.js'  , staticFile('generated-web/bundle.js', 'text/javascript; charset=UTF-8'));

        app.use(cookieParser());

        app.use(bodyParser.urlencoded({
                extended: true
        }));

        app.use(expressSession({
                name: 'sid',
                secret: config.sessionSecret,
                cookie: { path: '/', httpOnly: true, secure: false, maxAge: null },
                resave: false,
                saveUninitialized: false,
                store: sessionStore
        }));

        passportInit(model, config, app, primus);

        app.use('/company-logo', companyLogo(model, config));

        app.use(function controllerRequest(req, res)
        {
                // These Resource objects are used for the server to make
                // request for its own controllers.  Therefor spark = null;
                var contextResources = resources(null, model, config, req.user);

                var context = new ClientContext(true);
                context.router = router;
                context.document = new BaseDocument(document, router);
                context.resource = contextResources;
                context.setUserFromDB(req.user);
                context.sessionID = req.sessionID;
                context.document.addJSONData('mySessionID', context.sessionID);

                context.document.setUser(context.user);

                var front = new FrontController(context);
                var states = context.router.parse(req.url);

                if (config.googleAnalyticsUACode)
                {
                        context.document.addGoogleAnalytics(
                                config.googleAnalyticsUACode,
                                packageJson.name,
                                packageJson.version
                        );
                }

                getOrSetCsrfToken(req, res).then(function(token)
                {
                        context.csrfToken = token;
                        context.document.addJSONData('myCsrfToken', token);

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
                spark.on('EHLO', function(data, result)
                {
                        spark.mySessionID = (data.sessionID || '') + '';

                        sessionStore.getAsync(spark.mySessionID)
                        .bind({ // result object
                                user: null
                        })
                        .then(function(session)
                        {
                                spark.mySession = session;
                                if (!session ||
                                    !session.passport ||
                                    !session.passport.user)
                                {
                                        return P.resolve(null);
                                }

                                return P.using(model.acquire(), function(client)
                                {
                                        var userCollection = P.promisifyAll(client.collection('user'));
                                        return userCollection.findOneAsync({_id: session.passport.user});
                                });
                        })
                        .then(function(user)
                        {
                                this.user = ClientContext.convertUserFromDB(user);
                                spark.myUser = user;
                                spark.resources = resources(spark, model, config, user);
                        })
                        .catch(function(err)
                        {
                                console.error('Error retrieving session/user', err);
                                spark.resources = resources(spark, model, config, null);
                        }).finally(function()
                        {
                                result(this);
                        });
                });
        });

        return P.resolve({
                server: server,
                primus: primus
        });
}

function startServer()
{
        process.title = packageJson.name + ' ' + packageJson.version + ' (nodejs)';

        console.log(packageJson.name + ' ' + packageJson.version +
                    ' starting server...');

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