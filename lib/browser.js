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
var P = require('bluebird');
var domv = require('domv');
var ga = require('ga-browser')();
var Router = require('stateful-controller-browser-router');

var PrimusClientHandler = require('./PrimusClientHandler');
var BaseDocument = require('./view/BaseDocument');
var ClientContext = require('./ClientContext');
var FrontController = require('./controller/FrontController');
var urlStateMap = require('./url-state-map');
var resources = require('./resource/client');
var debugMode = false;

var router;
var document = global.document;
var context;
var front;
var primusHandler;
var contextResources;

function isSupported()
{
        // todo add more checks
        return domv.isSupported(document) && Router.isSupported(global.window);
}

function gaPageView(url)
{
        ga('send', 'pageview', {
                'page': url,
                'title': context.document.title
        });
}

function setupNavigation()
{
        front = new FrontController(context);
        router = new Router(global.window, urlStateMap, front);

        if (debugMode)
        {
                // do not add these to the `window` directly to make sure other scripts are not accidentally using globals
                global.dbg = {
                        Promise: P,
                        domv: domv,
                        urlStateMap: urlStateMap,
                        context: context,
                        front: front,
                        router: router
                };
        }

        router.on('upgradeInitialState', function(stateList, url, promise)
        {
                console.info('Wrapping initial state:', url, '->', stateList);
                context.document.stateTransitionPending = true;
        });

        router.on('historyPopState', function(stateList, url, promise)
        {
                console.info('Entering state from history:', url, '->', stateList);
                context.document.stateTransitionPending = true;
        });

        router.on('transitionComplete', function(stateList, url)
        {
                console.info('State transition complete:', url, '->', stateList);
                gaPageView(url);
                context.document.stateTransitionPending = router.pending;
        });

        router.on('transitionFailed', function(stateList, err)
        {
                console.info('State transition failed:', stateList, err.toString());
                context.document.stateTransitionPending = router.pending;
        });

        router.attachPopStateListener();

        context.document.on('domv-stateselect', function(e)
        {
                var prev = front.getFullStateList();
                var pushState = urlStateMap.isNewHistoryState(prev, e.state);
                router.queueEnterStates(e.state, pushState);
                e.preventDefault(); // do not follow the <a>
        });

        router.upgradeInitialState();
}

var contextNewState = P.method(function(states)
{
        console.info('Controller triggered a state transition to', states);
        context.document.stateTransitionPending = true;
        return router.queueEnterStates(states);
});

var contextReplaceState = function(states)
{
        console.info('Controller triggered a state replacement to', states);
        router.replaceStateList(states);
};

function loaded()
{
        var baseDocument = new BaseDocument(document.documentElement, urlStateMap);
        var mySessionID = baseDocument.getJSONData('mySessionID');
        var myCsrfToken = baseDocument.getJSONData('myCsrfToken');

        primusHandler = new PrimusClientHandler(mySessionID, debugMode);

        primusHandler.initialize().then(function(initializeData)
        {
                contextResources = resources(primusHandler.primus, primusHandler.share);

                context = new ClientContext(false);
                context.urlStateMap = urlStateMap;
                context.document = baseDocument;
                context.resource = contextResources;
                context.user = initializeData.user;
                context.sessionID = mySessionID;
                context.csrfToken = myCsrfToken;
                context.newState = contextNewState;
                context.replaceState = contextReplaceState;

                setupNavigation();

        }).catch(ga.logException);
}


function browserInitialize()
{
        debugMode = document.documentElement.hasAttribute('data-debug-mode');
        if (debugMode)
        {
                console.info('Debug mode enabled');
                P.longStackTraces();
                /* jshint -W106 */
                global.ga_debug = {trace: true};
                require('./resource/Resource').debugLogging = true;
        }

        if (document.documentElement.hasAttribute('data-ga'))
        {
                ga('create', document.documentElement.getAttribute('data-ga'));
        }
        else
        {
                global.ga = function(){};
        }

        ga('set', 'appName', document.documentElement.getAttribute('data-name'));
        ga('set', 'appVersion', document.documentElement.getAttribute('data-version'));

        global.addEventListener('unhandledrejection', function(e)
        {
                var err = e.detail.reason;
                // e.detail.promise

                // do not call preventDefault so that the error is also logged
                ga('send', 'exception', {
                        'exDescription': err.toString() + '\n\n' + err.stack,
                        'exFatal': true
                });
        });

        if (!isSupported())
        {
                ga('send', 'exception', {
                        'exDescription': 'Browser failed client-side feature detection',
                        'exFatal': true
                });

                if (global.console)
                {
                        console.error('Browser did not pass capability check, aborting');
                }
                return;
        }

        if (typeof global.console === 'undefined')
        {
                global.console = {
                        log: function(){},
                        info: function(){},
                        warn: function(){},
                        error: function(){}
                };
        }

        if (document.readyState === 'loading')
        {
                document.addEventListener('DOMContentLoaded', loaded);
        }
        else
        {
                loaded();
        }
}

module.exports = browserInitialize;
