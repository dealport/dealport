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