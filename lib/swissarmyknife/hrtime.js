'use strict';

var performance = global.performance;
var process = global.process;

/**
 * Returns a high resolution timestamp in milliseconds.
 * This function can only be used to measure elapsed time and is not related to any other notion of system or wall-clock time.
 * @return {Number} milliseconds
 */

if (performance)
{
        module.exports = function ()
        {
                return performance.now();
        };
}
else if (process)
{
        module.exports = function ()
        {
                var now = process.hrtime();
                return now[0] * 1000 + now[1] / 1000000;
        };
}
else
{
        module.exports = function ()
        {
                return Date.now();
        };
}