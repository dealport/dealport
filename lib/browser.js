'use strict';
var P = require('bluebird');
var Primus = require('../generated-web/primus');

var BaseDocument = require('./view/BaseDocument');
var ClientContext = require('./ClientContext');
var FrontController = require('./controller/FrontController');
var router = require('./controller/router');
var resources = require('./resource/client');
var domv = require('domv');

var document = global.document;
var location = global.location;
var context;
var front;
var statePromise = P.resolve();
var queuedState; // The user wants to switch to a new state during a state transfer
var queuedStateByUI = false;
var history = global.history;
var primus;
var contextResources;

// todo use versioning in the primus connection to reload the client if the server has been updated
// todo track uncaught errors (also on promises) and log them (e.g. google analytics)

function isSupported()
{
        // todo add more checks
        return domv.isSupported(document);
}

function pushHistoryState(state)
{
        history.pushState({state: state}, context.document.title, router.stringify(state));
}

function isStateTransferPending()
{
        return statePromise.isPending();
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

        console.info('Entering new state from queue', state);

        queuedState = null;
        queuedStateByUI = false;

        context.document.stateTransitionPending = true;
        statePromise = front.state(state);

        statePromise.done(function()
        {
                if (byUI)
                {
                        pushHistoryState(state);
                }

                stateTransitionDone();
        });
}

function stateTransitionDone()
{
        console.log('State transition is done');
        context.document.stateTransitionPending = false;
        doQueuedState();
}

function handleHistoryState(historyState, initial)
{
        var state;
        if (!historyState || !historyState.state)
        {
                return false;
        }

        state = historyState.state;

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
        return front.state(state);
}

function newStateByUser(state)
{
        console.info('Entering new state by UI', state);

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
        .finally(function()
        {
                pushHistoryState(state);
        });
}

function loaded()
{
        var states, path;

        context = new ClientContext(false, router, new BaseDocument(document.documentElement, router), contextResources);
        global.tstContext = context; // todo testing
        front = new FrontController(context);

        global.onpopstate = function(e)
        {
                var p = handleHistoryState(e.state, false);
                if (p)
                {
                        statePromise = p;
                        statePromise.done(stateTransitionDone);
                }
        };

        context.document.addDomListener('domv-stateselect', function(e)
        {
                var p;

                e.preventDefault(); // prevent browser <a> click action
                p = newStateByUser(e.state);
                if (p)
                {
                        statePromise = p;
                        statePromise.done(stateTransitionDone);
                }
        });

        context.wrapLoadedPage = true;
        if (history.state)
        {
                statePromise = handleHistoryState(history.state, true);
        }
        else
        {
                path = location.pathname + location.search;
                states = context.router.parse(path);
                console.info('Wrapping initial state from location', path, states);
                context.document.stateTransitionPending = true;
                statePromise = front.state(states);
        }

        statePromise.finally(function()
        {
                context.wrapLoadedPage = false;
        }).done(stateTransitionDone);
}

function browserInitialize()
{
        if (!isSupported())
        {
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

        primus = new Primus({
                url: '' // use defaultUrl
        });
        contextResources = resources(primus);

        primus.on('open', function primusOpen()
        {
                console.log('Primus connected');
        });

        primus.on('error', function primusError(err)
        {
                console.error('Primus error', err);
        });

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
