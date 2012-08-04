/*
 * This class is used internally by Ext.ux.direct.RemotingProvider to represent
 * a Direct method.
 *
 * Version 0.99.
 *  
 * Copyright (C) 2011-2012 Alexander Tokarev. Special thanks to IntelliSurvey, Inc
 * for sponsoring part of my work on this code.
 *
 * This code is licensed under the terms of the Open Source LGPL 3.0 license.
 * Commercial use is permitted to the extent that the code/component(s) do NOT
 * become part of another Open Source or Commercially licensed development library
 * or toolkit without explicit permission.
 * 
 * License details: http://www.gnu.org/licenses/lgpl.html
 */

Ext.define('Ext.ux.direct.RemotingMethod', {
    override: 'Ext.direct.RemotingMethod',
    
    /**
     * Takes the arguments for the Direct function and splits the arguments
     * from the scope, callback and options.
     *
     * @param {Array} args The arguments passed to the direct call
     * @return {Object} An object with 4 properties: args, callback, scope and options.
     */
    getCallData: function(args){
        var me     = this,
            data   = null,
            len    = me.len,
            params = me.params,
            callback, scope, options;
        
        if ( me.ordered ) {
            callback = args[len];
            scope    = args[len + 1];
            options  = args[len + 2];
            
            if (len !== 0) {
                data = args.slice(0, len);
            }
        } else {
            data     = Ext.apply({}, args[0]);
            callback = args[1];
            scope    = args[2];
            options  = args[3];

            // filter out any non-existent properties
            for ( var name in data ) {
                if ( data.hasOwnProperty(name) && !Ext.Array.contains(params, name) ) {
                    delete data[name];
                }
            }
        };

        return {
            data:     data,
            callback: callback,
            scope:    scope,
            options:  options
        };
    }
});
