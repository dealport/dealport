/*
 * DealPort
 * Copyright (c) 2015  DealPort B.V.
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
var lazyTimer = require('lazy-timer');
var hrtime = require('../swissarmyknife/hrtime');
var Controller = require('stateful-controller');

var StateAnchor = require('../view/StateAnchor');

function UserDetailPageController(context, pageView, user, acquireContextsResult)
{
        Controller.call(this, context);
        this.pageView = pageView;
        this.user = user;
        this.acquireContextsResult = acquireContextsResult;

        // send database updates every 500ms
        this._onEditChange = lazyTimer(500, true, this, this._onEditChangeImpl);
        this._onEditChangeSince = 0;
        this._onUserOp = this._onUserOp.bind(this);
}

require('inherits')(UserDetailPageController, Controller);
module.exports = UserDetailPageController;

UserDetailPageController.prototype.beforeEnter = function(state, upgrade)
{
        if (this.acquireContextsResult)
        {
                this.acquireContextsResult.addListener(this._onUserOp, this);
        }
};

UserDetailPageController.prototype.afterLeave = function()
{
        if (this.acquireContextsResult)
        {
                this.acquireContextsResult.removeListener(this._onUserOp, this);
        }
};

UserDetailPageController.prototype._onUserOp = function(id, snapshot, components, keys)
{
        if (keys.indexOf('namedEntityId') >= 0)
        {
                if (this.editAnchor)
                {
                        var namedEntityState = new this.context.router.NamedEntity(snapshot.namedEntityId || id);
                        var states = this.getFullStateList(this.currentState === 'edit' ? 'none' : 'edit');
                        states[states.length - 2] = namedEntityState;
                        this.editAnchor.state = states;
                }
        }
};

UserDetailPageController.prototype.enterNone = function(state, upgrade)
{
        var doc = this.context.document;
        var router = this.context.router;

        if (upgrade)
        {
                this.editAnchor = doc.contextualMenu.selector('> .editAnchor', StateAnchor, router);
        }
        else
        {
                if (this.user.editableByCurrentUser)
                {
                        doc.contextualMenu.appendChild(
                                this.editAnchor = new StateAnchor(
                                        doc.document,
                                        router,
                                        this.getFullStateList('edit'),
                                        '[ edit ]'
                                ).cls('editAnchor')
                        );
                }
        }

};

UserDetailPageController.prototype.leaveNone = function()
{
        if (this.editAnchor)
        {
                this.editAnchor.removeNode();
                this.editAnchor = null;
        }
};

UserDetailPageController.prototype.enterEdit = function(state, upgrade)
{
        var doc = this.context.document;
        var router = this.context.router;
        var user = this.context.user;
        var pageView = this.pageView;

        if (upgrade)
        {
                this.editAnchor = doc.contextualMenu.selector('> .editAnchor', StateAnchor, router);
        }
        else
        {
                if (user)
                {
                        pageView.editing = true;
                }

                doc.contextualMenu.appendChild(
                        this.editAnchor = new StateAnchor(doc.document, router, this.getFullStateList('none'), '[ stop editing ]').cls('editAnchor')
                );
        }

        if (user)
        {
                pageView.on('domv-editable-change', this._onEditChange, false, this);
        }
};

UserDetailPageController.prototype.leaveEdit = function()
{
        var pageView = this.pageView;
        pageView.removeListener('domv-editable-change', this._onEditChange, false, this);
        pageView.editing = false;
        this.context.document.lastSave = null;
        this.editAnchor.removeNode();
        this.editAnchor = null;
};

UserDetailPageController.prototype._onEditChangeImpl = function(done)
{
        var since = this._onEditChangeSince;
        var pageView = this.pageView;
        this._onEditChangeSince = hrtime();
        var acquireContextsResult = this.acquireContextsResult;

        P.using(this.context.document.savePendingDisposer(), function()
        {
                var values = pageView.getValues(since);
                if (!values)
                {
                        // nothing has been changed
                        return null;
                }

                var context = acquireContextsResult.get(pageView.id);
                if (!context)
                {
                        console.warn('Unable to update company %s, the sharejs context is missing',
                                pageView.id);
                }

                // todo send real changes
                var op = Object.keys(values).map(function(key)
                {
                        var val = values[key];

                        // todo real value for od
                        var od;
                        if (typeof val === 'boolean')
                        {
                                od = false;
                        }
                        else if (typeof val === 'string')
                        {
                                od = '';
                        }
                        else if (typeof val === 'number')
                        {
                                od = 0;
                        }
                        else if (Array.isArray(val))
                        {
                                od = [];
                        }
                        else if (val === null)
                        {
                                od = null;
                        }
                        else
                        {
                                od = {};
                        }

                        return {
                                p : [key],
                                od: od,
                                oi: val
                        };
                }).filter(function (comp)
                {
                        return !!comp;
                });

                return context.submitOpAsync(op)
                .bind(this)
                .then(function()
                {
                        this.context.document.lastSave = new Date();
                });

        }.bind(this))
        .finally(done);

        // todo show message if no client side support
};
