'use strict';

var performance = global.performance;
var process = global.process;

/**
 * Returns a high resolution timestamp in milliseconds.
 * This function can only be used to measure elapsed time and is not related to any other notion of system or wall-clock time.
 * @return {Number} milliseconds float
 */

if (performance)
{
        module.exports = function highResolutionTime(since)
        {
                if (arguments.length === 1)
                {
                        return performance.now() - since;
                }
                else
                {
                        return performance.now();
                }
        };

        module.exports.fallback = module.exports;
}
else if (process)
{
        module.exports = function highResolutionTime(since)
        {
                var time = process.hrtime();
                time = time[0] * 1000 + time[1] / 1000000;

                if (arguments.length === 1)
                {
                        return time - since;
                }
                else
                {
                        return time;
                }

        };
        module.exports.fallback = module.exports;
}
else
{
        module.exports = function highResolutionTime(since)
        {
                throw Error('This environment does not support a high resolution time source');
        };

        module.exports.fallback = function highResolutionTimeFallback(since)
        {
                if (arguments.length === 1)
                {
                        return Date.now() - since;
                }
                else
                {
                        return Date.now();
                }
        };
}