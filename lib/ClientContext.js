'use strict';

function ClientContext(server)
{
        this.server = !!server;
        this.router = null;

        /** @var BaseDocument */
        this.document = null;
        /** set to true when the client is wrapping existing DOM content */
        this.wrapLoadedPage = false;

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

