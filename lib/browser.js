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

var PrimusClientHandler = require('./PrimusClientHandler');
var BaseDocument = require('./view/BaseDocument');
var ClientContext = require('./ClientContext');
var FrontController = require('./controller/FrontController');
var urlStateMap = require('./url-state-map');
var resources = require('./resource/client');
var debugMode = false;

var document = global.document;
var location = global.location;
var context;
var front;
var statePromise = P.resolve();
var queuedState; // The user wants to switch to a new state during a state transfer
var queuedStateByUI = false;
var history = global.history;
var initialState = null;
var replacingStateWith = null;
var primusHandler;
var contextResources;

function isSupported()
{
        // todo add more checks
        return domv.isSupported(document);
}

function pushHistoryState(state, newState)
{
        var url = urlStateMap.toURL(state);
        if (newState)
        {
                history.pushState({state: state}, context.document.title, url);
        }
        else
        {
                history.replaceState({state: state}, context.document.title, url);
        }
}

function gaPageView(state)
{
        var url = urlStateMap.toURL(state);
        ga('send', 'pageview', {
                'page': url,
                'title': context.document.title
        });
}

function isStateTransferPending()
{
        return statePromise &&
               statePromise.isPending();
}

var stateTransitionDone;

function doQueuedState()
{
        var state = queuedState;
        var byUI = queuedStateByUI;

        if (!state)
        {
                return;
        }

        var previousState = front.getFullStateList();
        var newState = urlStateMap.isNewHistoryState(previousState, state);

        console.info('Entering new state from queue', state, newState);

        queuedState = null;
        queuedStateByUI = false;

        context.document.stateTransitionPending = true;
        statePromise = front.state(state)
        .done(function()
        {
                if (byUI)
                {
                        pushHistoryState(replacingStateWith || state, newState);
                        gaPageView(replacingStateWith || state);
                        replacingStateWith = null;
                }

                stateTransitionDone();
        });
}

function stateTransitionDone()
{
        console.log('State transition is done');
        context.document.stateTransitionPending = false;
        setTimeout(doQueuedState, 0);
}

function handleHistoryState(historyState, initial)
{
        var state;
        if (!historyState || !historyState.state)
        {
                return false;
        }

        state = historyState.state;
        state = state.map(urlStateMap.wakeup, urlStateMap);

        console.info('Entering', initial ? 'initial' : 'new', 'state from history', state);

        if (isStateTransferPending())
        {
                console.warn('A previous state transfer is pending, this state will be queued', state);
                // (overwrite the previous queued state)
                queuedState = state;
                queuedStateByUI = false;
                return false;
        }

        context.document.stateTransitionPending = true;
        return front.state(state, initial);
}

function newStateByUser(state)
{
        var previousState = front.getFullStateList();
        var newState = urlStateMap.isNewHistoryState(previousState, state);

        console.info('Entering new state by UI', state, newState);

        if (isStateTransferPending())
        {
                console.warn('A previous state transfer is pending, this state will be queued', state);
                // (overwrite the previous queued state)
                queuedState = state;
                queuedStateByUI = true;
                return false;
        }

        context.document.stateTransitionPending = true;

        return front.state(state)
        .catch(ga.logException)
        .finally(function()
        {
                pushHistoryState(replacingStateWith || state, newState);
                gaPageView(replacingStateWith || state);
                replacingStateWith = null;
        });
}

function setupNavigation()
{
        var states, path;
        front = new FrontController(context);

        if (debugMode)
        {
                // do not add it to window directly to make sure other scripts are not accidentally using globals
                global.dbg = {
                        Promise: P,
                        domv: domv,
                        urlStateMap: urlStateMap,
                        context: context,
                        front: front
                };
        }

        global.onpopstate = function(e)
        {
                // if e.state is null, we should go back to the initial (wrapped) state
                var p = handleHistoryState(e.state || initialState, false);
                if (p)
                {
                        statePromise = p.done(stateTransitionDone);
                }
        };

        context.document.on('domv-stateselect', function(e)
        {
                var p;

                e.preventDefault(); // prevent browser <a> click action
                p = newStateByUser(e.state);
                if (p)
                {
                        statePromise = p.done(stateTransitionDone);
                }
        });

        if (history.state)
        {
                initialState = history.state;
                statePromise = handleHistoryState(history.state, true);
        }
        else
        {
                path = location.pathname + location.search;
                states = context.urlStateMap.fromURL(path);
                initialState = {state: states};
                console.info('Wrapping initial state from location', path, states);
                context.document.stateTransitionPending = true;
                statePromise = front.state(states, true);
        }

        gaPageView(initialState.state);

        statePromise = statePromise.catch(ga.logException)
        .done(stateTransitionDone);
}

var contextNewState = P.method(function(states)
{
        console.info('Controller triggered a state transition to', states);
        // newStateByUser handles isStateTransferPending
        var p = newStateByUser(states);
        if (p)
        {
                statePromise = p;
                return statePromise.then(stateTransitionDone).return(front);
        }

        return P.resolve(front);
});

var contextReplaceState = function(states)
{
        console.info('Controller triggered a state replacement to', states);
        if (isStateTransferPending())
        {
                replacingStateWith = states;
        }
        else
        {
                pushHistoryState(states, false); // false = replaceState
        }
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
