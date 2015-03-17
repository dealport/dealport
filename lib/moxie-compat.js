'use strict';

var mOxie = global.mOxie = require('plupload/js/moxie').mOxie;

function summonFileDialogFix(OriginalRuntime)
{
        function SummonFileDialogFixRuntime()
        {
                OriginalRuntime.apply(this, arguments);

                var can = this.can;
                this.can = function(cap, value)
                {
                        if (value === void 123)
                        {
                                return can.apply(this, arguments);
                        }

                        if (cap === 'summon_file_dialog')
                        {
                                return !value;
                        }

                        return can.apply(this, arguments);
                };
        }

        return SummonFileDialogFixRuntime;
}

mOxie.Runtime.addConstructor('html5', summonFileDialogFix(mOxie.Runtime.getConstructor('html5')));
mOxie.Runtime.addConstructor('html4', summonFileDialogFix(mOxie.Runtime.getConstructor('html4')));

