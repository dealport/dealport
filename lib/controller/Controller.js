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

/**
 * @typedef {(string|Object)} ControllerState
 */
/**
 * @typedef {ControllerState[]} ControllerStateList
 */


/**
 * The (abstract) base class for Controllers.
 * Each controller is a state machine. A state might instantiate a different controller (which also has a state).
 * There is usually a single Controller that everything begins with (the FrontController).
 * If a route is assigned, it simply defines the hierarchy of states it must assign, for
 * example ['page', 'contact', 'map'] would cause the FrontController to enter the state 'page', this state
 * creates a PageController which is assigned the state 'contact', and so on.
 * @param {ClientContext} context
 * @constructor
 */
function Controller(context)
{
        if (this.constructor === Controller)
        {
                throw Error('Controller is abstract');
        }

        Object.defineProperty(this, 'context' , { value: context });

        this.currentState = null;
        this.__child__ = null;
        this.__parent__ = null;
}

module.exports = Controller;
Object.defineProperty(Controller.prototype, 'isController', { value: true });


/** The current child controller. Setting this attribute also updates the proper .parent attributes.
 * @member {Controller} child
 * @memberOf Controller
 * @instance
 */
Object.defineProperty(Controller.prototype, 'child', {
        get: function()
        {
                return this.__child__;
        },
        set: function(value)
        {
                if (value && value.isController !== true)
                {
                        throw Error('value should be a Controller or null');
                }

                if (this.__child__)
                {
                        this.__child__.__parent__ = null;
                }

                this.__child__ = value;

                if (this.__child__)
                {
                        this.__child__.__parent__ = this;
                }
        }
});

/** The current parent controller. Setting this attribute also updates the proper .child attributes.
 * @member {Controller} parent
 * @memberOf Controller
 * @instance
 */
Object.defineProperty(Controller.prototype, 'parent', {
        get: function()
        {
                return this.__parent__;
        },
        set: function(value)
        {
                if (value && value.isController !== true)
                {
                        throw Error('value should be a Controller or null');
                }

                if (this.__parent__)
                {
                        this.__parent__.__child__ = null;
                }

                this.__parent__ = value;

                if (this.__parent__)
                {
                        this.__parent__.__child__ = this;
                }
        }
});

/**
 * @example Controller.stateMethodName('enter', 'foo') // 'enterFoo'
 * @example Controller.stateMethodName('enter', {abc: 5, stateName: 'enterFoo', ...} // 'enterFoo'
 * @param {string} prefix
 * @param {ControllerState} state
 * @returns {string}
 */
Controller.stateMethodName = function(prefix, state)
{
        if (typeof state === 'object')
        {
                state = state.stateName;
        }

        state = state.toString();

        return prefix + state.charAt(0).toUpperCase() + state.slice(1);
};

/**
 * Are two states equal?.
 * If both states are a string, case sensitive string matching is used.
 * If stateA is an object, return <code>stateA.isStateEqual(stateB)</code>
 * @param {ControllerState} stateA
 * @param {ControllerState} stateB
 * @returns {boolean}
 */
Controller.statesEqual = function(stateA, stateB)
{
        if (stateA &&
            stateB &&
            typeof stateA === 'object')
        {
                if (!stateA.isStateEqual)
                {
                        throw Error('If a state is an object, it must implement a isStateEqual(other) method');
                }

                return stateA.isStateEqual(stateB);
        }

        return stateA === stateB;
};


/**
 * Assign a chain of states to this controller and its children.
 * Each controller has 0 or 1 child controllers. When a controller enters a state, it might create a child controller
 * for that state (by setting the child attribute on its controller).
 * That child controller is also assigned a state by this method (the next one in the chain).
 *
 * @example
 * myController.state('pages', 'contact', 'foo'); // myController is set to the state 'pages',
 *                                                // its child controller is set to 'contact', and so on.
 * @param {ControllerStateList[]} state The state chain, or null to leave the state without setting a new one.
 * @param {boolean} [upgrade=false] If true, the "results" of the given "state" is already present in some form.
 *        These "results" were generated by a previous state transition in a different address space. If this
 *        parameter is "true" you will have to parse the existing "results" and set up any variables, attributes, event
 *        listeners, etc, so that your controller matches the one in the different address space.
 *        After this "upgrade", non-upgrade state transitions are able to occur. This means your
 *        "leave" methods must be able to modify these existing "results" so that the state transition is able to execute
 *        properly.
 *
 *        The most common use case for upgrades is in a client-server web application. An example:
 *
 *        1. The client performs a GET request to "/foo"
 *        2. The client & server translate "/foo" to the state ['page', 'foo']
 *        3. The server creates a ClientContext including a new DOM Document
 *        4. The server creates a: new FrontController(clientContext)
 *        5. The server executes frontController.state(['page', 'foo'], false)
 *        6. The server serializes the DOM Document as html and sends it to the client as a HTTP response
 *        7. The client creates a ClientContext including the DOM Document of the html it received
 *        8. The client creates a: new FrontController(clientContext)
 *        9. The client executes frontController.state(['page', 'foo'], true)
 *        10. The client is now able to execute other state transitions.
 *            e.g. frontController.state(['page', 'bar'], false)
 *
 * @return {!Promise}
 */
Controller.prototype.state = function(state, upgrade)
{
        if (!Array.isArray(state))
        {
                throw new Error('Invalid argument, "state" must be an array');
        }

        var myState = state[0];
        var childState = state[1];
        var childStateChain = state.slice(1);

        var childLeave = function()
        {
                if (this.child)
                {
                        return this.child.state([null], !!upgrade);
                }
        }.bind(this);

        var myLeave = function()
        {
                if (this.currentState)
                {
                        try
                        {
                                return this.leave();
                        }
                        finally
                        {
                                this.currentState = null;
                                this.child = null;
                        }
                }
        }.bind(this);

        var myEnter = function()
        {
                if (myState)
                {
                        this.currentState = myState;
                        return this.enter(myState, !!upgrade);
                }
        }.bind(this);

        var childEnter = function()
        {
                if (childState)
                {
                        if (!this.child)
                        {
                                throw Error('Attempting to set child state "'+childState+'", but no child controller has been set by the state "' + myState + '".');
                        }

                        return this.child.state(childStateChain, !!upgrade);
                }
                else
                {
                        if (this.child)
                        {
                                throw Error('Attempting to set state "' + myState + '", but the state for the child controller is missing');
                        }
                }
        }.bind(this);

        if (Controller.statesEqual(this.currentState, myState))
        {
                return P.resolve().then(childEnter);
        }
        else
        {
                return P.resolve().then(childLeave).then(myLeave).then(myEnter).then(childEnter);
        }
};

/**
 * This method is invoked by .state(...) when the state for this controller should change (leave() is called first).
 * The default implementation translates the state to a method invocation.
 * e.g. "foo" -> this.enterFoo()
 * Override this method if you want to do something else (like pulling the states
 * out of a database);
 * @param {ControllerState} state string or an object that describes your state. toString() is called on the object to
 *        determine the method name to use. {abc: 5, toString: function(){ return 'foo';}, ...} -> this.enterFoo()
 * @param {boolean} [upgrade=false] Upgrading the results of a state transition in a different address space? See the
 *        state() method for more documentation.
 * @throws {Error} If the state method does not exist.
 * @return {?Promise}
 * @protected Use .state() to set the state
 */
Controller.prototype.enter = function(state, upgrade)
{
        var method;
        this.currentState = state;

        method = Controller.stateMethodName('enter', state);
        if (typeof this[method] !== 'function')
        {
                throw Error('State method ' + method + ' does not exist');
        }

        return this[method](state, !!upgrade);
};

/**
 * This method is invoked by .state(...) when the current state is being left.
 * The default implementation translates the state to a method invocation.
 * e.g. "foo" -> this.leaveFoo();
 * Unlike enter(), this method does not throw if this method does not exist.
 * @protected Use .state(null) to leave the state
 * @return {?Promise}
 */
Controller.prototype.leave = function()
{
        var method;

        method = Controller.stateMethodName('leave', this.currentState);

        if (typeof this[method] === 'function')
        {
                return this[method]();
        }
};

/**
 * Find the top most Controller by iterating over .parent and return it
 * @returns {Controller}
 */
Controller.prototype.getRootController = function()
{
        var cont = this;
        while (cont.parent)
        {
                cont = cont.parent;
        }

        return cont;
};

/**
 * Return the states of this controller and all its children (in that order).
 * If this controller has not been assigned a state yet, [null] is returned.
 * @returns {ControllerStateList}
 */
Controller.prototype.getChildrenStateList = function()
{
        var states = [];
        var cont = this;

        while (cont)
        {
                states.push(cont.currentState);
                cont = cont.child;
        }

        return states;
};

/**
 * Return the states of all the parents of this controller and the controller itself (in that order)
 * @returns {ControllerStateList}
 */
Controller.prototype.getParentsStateList = function()
{
        var states = [];
        var cont = this;

        while (cont)
        {
                states.unshift(cont.currentState);
                cont = cont.parent;
        }

        return states;
};

/**
 * Return the states of all the parents of this controller and the given "state" (in that order)
 * This gives you the state list needed to reach a different state in your controller instance.
 * @param {ControllerState} state
 * @returns {ControllerStateList}
 */
Controller.prototype.getStateListFor = function(state)
{
        var states = this.getParentsStateList();
        states[states.length - 1] = state;
        return states;
};