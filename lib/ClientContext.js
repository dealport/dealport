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

function ClientContext(server)
{
        this.server = !!server;
        this.router = null;

        /** @var BaseDocument */
        this.document = null;

        this.resource = null;

        /** The user object that belongs to the current session */
        this.user = null;
        this.sessionID = '';
        this.csrfToken = '';

        // These are only set on the server side:
        /** If this is a server side context, was the CSRF token valid during the POST request? */
        this.csrfValid = false;
        /** If this is a server side context, the content of the post data (always set, even if the CSRF token is invalid) */
        this.postData = null;
}

module.exports = ClientContext;

ClientContext.convertUserFromDB = function(user)
{
        if (!user)
        {
                return null;
        }

        // This is the object that is stored as "user" in all of the
        // ClientContex's
        return {
                _id: user._id && user._id.toString(),
                displayName: user.displayName,
                email: user.email
        };
};

ClientContext.prototype.setUserFromDB = function(user)
{
        this.user = ClientContext.convertUserFromDB(user);
};

