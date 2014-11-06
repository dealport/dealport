DealPort
========

Running for the first time
--------------------------

Install node.js and npm:

    # Ubuntu / Debian
    sudo apt-get install -y nodejs npm
    
For other operating systems see [Installing-Node.js-via-package-manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

On windows you will also need to install [Python 2.7](https://www.python.org/downloads/) (make sure it is on your `%PATH%`) and [Visual Studio C++ Express for Windows Desktop](http://www.microsoft.com/en-us/download/details.aspx?id=43733)

Install dependencies for this project (node_modules):

    npm install

For MonogoDB connection configuration, see [Configuration](#configuration)
The default is `mongodb://localhost:27017/dealport`

Compile LESS CSS and Javascript bundles, run linter, etc (using grunt) and start the server:

    npm start

Configuration
-------------
See lib/server-config.js for valid config keys and their default values. To set a config value you can use:

    npm config set dealport:mongoUri foo
    
Or you can create a `.npmrc` file in the project root or in your home directory:

    mongoUri:listenHostname=0.0.0.0
    mongoUri:mongoUri=foo

Grunt
-----
Grunt is a task runner, you can install the grunt-cli using `sudo npm install -g grunt-cli`. Use `grunt -h` to display the tasks that are valid for this project.
If you are unable to install packages globally it is possible to run the grunt-cli locally using `./node_modules/.bin/grunt-cli dosomething`
