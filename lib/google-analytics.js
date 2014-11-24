'use strict';

var P = require('bluebird');

/* jshint -W117 */
function ga()
{
        var window = global.window;
        if (!window)
        {
                return; // node.js
        }

        if (!window.ga)
        {
                console.log('ga created');
                window.ga = function()
                {
                        (window.ga.q = window.ga.q || []).push(arguments);
                };

                window.ga.l = +new Date();
        }

        console.log('ga()', arguments);
        //console.log('ga()', arguments);
        return window.ga.apply(null, arguments);
}
/* jshint +W117 */

module.exports = ga;

/**
 * Use me in promises catch handlers and normal catch blocks
 * @param {Error} err
 * @returns {Promise} Rejected promise with err
 */
module.exports.logException = function(err)
{
        ga('send', 'exception', {
                'exDescription': err.toString() + '\n\n' + err.stack,
                'exFatal': true
        });
        return P.reject(err);
};