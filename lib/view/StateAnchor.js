'use strict';
var domv = require('domv');

function StateAnchor(node, router, state, content)
{
        var i;
        domv.Component.call(this, node, 'a');

        if (!router)
        {
                throw new domv.Exception(Error('new StateAnchor : router argument is required'));
        }
        this.router = router;

        if (this.isCreationConstructor(node))
        {
                this.cls('StateAnchor');
                this.state = state;

                for (i = 3; i < arguments.length; ++i)
                {
                        this.appendChild(arguments[i]);
                }
        }
        else
        {
                this.assertHasClass('StateAnchor');
        }

        this.on('click', this._click.bind(this));
}

module.exports = StateAnchor;
require('inherits')(StateAnchor, domv.Component);

Object.defineProperty(StateAnchor.prototype, 'state', {
        get: function()
        {
                return this.router.parse(this.getAttr('href'));
        },
        set: function(value)
        {
                var url;

                if (value)
                {
                        url = this.router.stringify(value);
                        if (url === null || url === undefined)
                        {
                                throw domv.Exception(Error('Unknown state ' + value.join(', ')));
                        }
                        this.attr('href', url);
                }
                else
                {
                        this.attr('href', null);
                }
        }
});

StateAnchor.prototype._click = function(e)
{
        var prevented;
        // this implementation has a useful side effect:
        // any StateAnchor which is not wrapped upon page load in the browser
        // will fallback to the default action for an <a href="..."> (visit the page).
        // this is a nice way to handle fallbacks for views which are not parseable for
        // some reason (e.g. an exception, or the visitor is using noscript)

        /*jshint -W016*/
        if (this.state &&
            (e.button === 0 ||
            e.buttons & 1)) // left mouse button
        {
                e.stopImmediatePropagation();

                // bubble this to the documentElement which is where the magic happens
                prevented = !this.emitDomCustom('domv-stateselect', {
                        state: this.state,
                        stateAnchor: this
                });

                if (prevented)
                {
                        // a listener of 'domv-stateselect' called e.preventDefault
                        e.preventDefault();
                }
        }
        /*jshint +W016*/
};