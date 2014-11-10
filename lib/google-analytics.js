'use strict';

/* jshint -W117 */
function ga()
{

        if (global.window && window.ga)
        {
                //console.log('ga()', arguments);
                return window.ga.apply(null, arguments);
        }
}
/* jshint +W117 */

module.exports = ga;

/**
 * Use me in promises catch handlers and normal catch blocks
 * @param {Error} err
 * @returns {Error} err same as argument
 */
module.exports.logException = function(err)
{
        ga('send', 'exception', {
                'exDescription': err.toString() + '\n\n' + err.stack,
                'exFatal': true
        });
        return err;
};