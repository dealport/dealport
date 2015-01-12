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

//var P = require('bluebird');
var Controller = require('stateful-controller');

var StateAnchor = require('../view/StateAnchor');

function UserDetailPageController(context, pageView, user)
{
        Controller.call(this, context);
        this.pageView = pageView;
        this.user = user;
}

require('inherits')(UserDetailPageController, Controller);
module.exports = UserDetailPageController;

/*todo
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
};*/

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
};

UserDetailPageController.prototype.leaveEdit = function()
{
        var pageView = this.pageView;
        pageView.editing = false;
        this.context.document.lastSave = null;
        this.editAnchor.removeNode();
        this.editAnchor = null;
};
