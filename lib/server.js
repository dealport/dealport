/*
 * DealPort
 * Copyright (c) 2014  DealPort B.V.
 *
 * This file is part of DealPort
 *
 * DealPort is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * DealPort is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with DealPort.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, the following supplemental terms apply, based on section 7 of
 * the GNU Affero General Public License (version 3):
 * a) Preservation of all legal notices and author attributions
 */

'use strict';
var packageJson = require('../package.json');
var http = require('http');
var express = require('express');
var accepts = require('accepts');
var expressSession = require('express-session');
var expressPlupload = require('express-plupload');
var morgan = require('morgan');
var nodePath = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var domv = require('domv');
var P = require('bluebird'); // P.longStackTraces();
var secureRandomBytes = P.promisify(require('crypto').randomBytes);
var clone = require('clone');
var ObjectID = require('mongodb').ObjectID;


var mongoInit = require('./model/mongo-init');
var config = require('./server-config');
var primusServer = require('./primus-server');
var passportInit = require('./passport-init');

var BaseDocument = require('./view/BaseDocument');
var ClientContext = require('./ClientContext');
var Controller = require('stateful-controller');
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
                        res.sendFile(
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

                        return;
                }

                plain();
        };
}

function errorRequest(err, req, res, next)
{
        console.error('Error during express handler', err, err.stack, '\n');

        if (!res.headersSent)
        {
                res.header('Content-Type', 'text/plain; charset=UTF-8');
                res.status(500);
                res.send(err.stack);
        }
}

function uploadedImage(model, config)
{
        return function(req, res)
        {
                var contextResources = resources(null, model, config, req.user);

                contextResources.UploadedImage.imageAsResponse(
                        req.url && req.url.slice(1),
                        res,
                        365 * 24 * 60 * 60 // Cache 1 year (a new image is a new url)
                );
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

var contextNewState = function(states)
{
        var context = this;
        context._setLocationState = clone(states, false);
        context._setLocation = context.router.stringify(states);
};

var contextReplaceState = function(states)
{
        var context = this;
        context._replaceLocation = context.router.stringify(states);
};

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

        app.use(function(req, res, next)
        {
                res.setHeader('X-Frame-Options', 'DENY');

                // disallows inline <script> and eval()
                var rules = [
                        'default-src \'self\'',
                        'script-src \'self\' www.google-analytics.com' + (config.cspAllowEval ? ' \'unsafe-eval\'' : ''),
                        // object-src
                        'img-src data: *',
                        'media-src *',
                        //'child-src \'none\'',
                        'frame-ancestors \'none\'',
                        'font-src fonts.googleapis.com fonts.gstatic.com',
                        //'form-action \'self\'',
                        'connect-src \'self\' ws://*:* wss://*:* www.google-analytics.com',
                        'style-src \'self\' \'unsafe-inline\' fonts.googleapis.com fonts.gstatic.com https://fonts.googleapis.com https://fonts.gstatic.com'
                ];

                // http://fonts.googleapis.com/css?family=Open+Sans:400,700,400italic
                res.setHeader('Content-Security-Policy', rules.join('; '));
                next();
        });

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


        var onHeaders = require('on-headers');
        app.use(function cleanupPassportSession(req, res, next)
        {
                // hook me in AFTER express-session
                onHeaders(res, function()
                {
                        if (Object.keys(req.session.passport).length === 0)
                        {
                                delete req.session.passport;
                        }
                });
                next();
        });

        passportInit(model, config, app, primus);

        app.use('/upload/image', function(req, res, next)
        {
                if (!req.user ||
                    !req.user._id)
                {
                        res.status(403).send('403 You are not logged in');
                        return; // do not continue to the middleware
                }

                if (!req.is(['png', 'jpg']))
                {
                        res.status(415).send('415 Not allowed to upload this mime type');
                        return; // do not continue to the middleware
                }

                next();
        });

        app.use('/upload/image', expressPlupload.middleware);
        app.use('/upload/image', function(req, res, next)
        {
                var plupload = req.plupload;

                // Stream is already open?
                if (!plupload.isNew)
                {
                        req.once('end', function()
                        {
                                res.status(201).send(201);
                        });
                        return;
                }

                // todo handle chunks as the same file

                var user = req.user;
                var mimeType = req.get('Content-Type');

                if (!mimeType ||
                    !user)
                {
                        throw Error('This should have been checked previously');
                }

                var fileId = new ObjectID();

                P.using(model.acquire(), function(db)
                {
                        // Otherwise it is a new file or a resume

                        // plupload.filename
                        // plupload.completedOffset
                        // plupload.stream

                        var gridStore = db.gridStore(
                                fileId,
                                'w', // todo use w+ if this is a chunk
                                {
                                        root: 'uploadedImage',
                                        'content_type': mimeType,
                                        createdByUser: user._id
                                }
                        );

                        return gridStore.openAsync()
                        .then(function()
                        {
                                return new P(function(resolve, reject)
                                {
                                        plupload.stream.on('data', function(data)
                                        {
                                                // todo max size check here

                                                plupload.stream.pause();

                                                gridStore.writeAsync(data)
                                                .then(function()
                                                {
                                                        plupload.stream.resume();
                                                })
                                                .catch(reject);
                                        });

                                        plupload.stream.on('end', function()
                                        {
                                                gridStore.closeAsync()
                                                .then(resolve, reject);
                                        });
                                });

                                /*// plupload FileUploaded event (uploader, file, {response: '{fileId: "f00"}'})
                                */
                        });

                })
                .then(function()
                {
                        res.status(201).json({
                                fileId: fileId.toString()
                        });
                })
                .catch(function(err)
                {
                        console.error('error while handling upload', err, err.stack);
                        res.status(500).send(err.stack);
                });

                // no next()
        });

        app.use('/uploads/image', uploadedImage(model, config));

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
                context.document.setUser(context.user); // todo sharejs context listener
                context.document.attr({
                        'data-name': packageJson.name,
                        'data-version': packageJson.version
                });
                context.newState = contextNewState;
                context._setLocationState = null;
                context._setLocation = null;
                context.replaceState = contextReplaceState;
                context._replaceLocation = null;

                var front = new FrontController(context);
                var states = context.router.parse(req.url);

                if (config.googleAnalyticsUACode)
                {
                        context.document.addJS('//www.google-analytics.com/analytics.js', true); // async
                        context.document.attr('data-ga', config.googleAnalyticsUACode);
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

                        // ignore redirects to the same state
                        if (context._setLocation &&
                            !Controller.stateListEqual(states, context._setLocationState))
                        {
                                // 303: temporary redirect and POST is converted to GET
                                res.statusCode = 303;
                                res.setHeader('Location', context._setLocation);
                                res.end();
                                return;
                        }

                        if (context._replaceLocation)
                        {
                                // Set location without a redirect
                                res.setHeader('Location', context._replaceLocation);
                        }

                        context.document.sendResponseAsHtml(res);

                }).catch(function(err)
                {
                        errorRequest(err, req, res, function(){});
                })
                .done();
        });

        app.use(errorRequest);

        var sharejsChannel = primus.channel('sharejs');

        primus.on('connection', function(spark)
        {
                spark.sessionStuff = {user: null};

                // attach subscribe listener to spark to wait for the channel
                model.listenForSharejsChannel(sharejsChannel, spark);

                spark.on('EHLO', function(data, result)
                {
                        spark.mySessionID = (data.sessionID || '') + '';
                        model.initializeSharejs(spark, data.sharejsStreamInstanceID);

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

                                return P.using(model.acquire(), function(db)
                                {
                                        return db.user.findOneAsync({_id: session.passport.user});
                                });
                        })
                        .then(function(user)
                        {
                                this.user = ClientContext.convertUserFromDB(user);
                                spark.sessionStuff.user = user;
                        })
                        .catch(function(err)
                        {
                                console.error('Error retrieving session/user', err);

                        })
                        .then(function()
                        {
                                spark.resources = resources(spark, model, config, spark.sessionStuff.user);
                        })
                        .finally(function()
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