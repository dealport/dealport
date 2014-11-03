'use strict';

var Controller = require('./Controller');
var PageController = require('./PageController');

function FrontController(context)
{
        Controller.call(this, context);
}

require('inherits')(FrontController, Controller);
module.exports = FrontController;

FrontController.prototype.enterPage = function(state)
{
        this.child = new PageController(this.context);
};

FrontController.prototype.enter404 = function(state)
{
        if (this.context.wrapLoadedPage)
        {

        }
        else
        {
                this.context.document.textContent = 'Route not found';
        }
};

FrontController.prototype.leave404 = function()
{
        this.context.document.textContent = '';
};