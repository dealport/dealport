'use strict';

module.exports = function ClientContext(server, router, document, resource)
{
        this.server = !!server;
        this.router = router;

        this.document = document;
        /** set to true when the client is wrapping existing DOM content */
        this.wrapLoadedPage = false;

        this.resource = resource;

        this.csrfToken = '';

        /** If this is a server side context, was the CSRF token valid during the POST request? */
        this.csrfValid = false;
        /** If this is a server side context, the content of the post data (always set, even if the CSRF token is invalid) */
        this.postData = null;

};
