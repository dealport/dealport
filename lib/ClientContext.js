'use strict';

// todo: database, user, etc
module.exports = function ClientContext(server, router, document, resource)
{
        this.server = !!server;
        this.router = router;

        this.document = document;
        /** set to true when the client is wrapping existing DOM content */
        this.wrapLoadedPage = false;

        this.resource = resource;
};
