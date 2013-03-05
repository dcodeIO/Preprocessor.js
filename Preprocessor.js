/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license Preprocessor.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/Preprocessor.js for details
 */
(function(global) {

    /**
     * Constructs a new Preprocessor.
     * @exports Preprocessor
     * @class Provides pre-processing of JavaScript source files, e.g. to build different versions of a library.
     * @param {string} source Source to process
     * @param {string} baseDir Source base directory used for includes when run in node.js. Defaults to the current working directory.
     * @constructor
     */
    var Preprocessor = function Preprocessor(source, baseDir) {

        /**
         * Source code to pre-process.
         * @type {string}
         */
        this.source = ""+source;

        /**
         * Source base directory.
         * @type {string}
         */
        this.baseDir = baseDir || ".";

        /**
         * Whether running inside of node.js or not.
         * @type {boolean}
         */
        this.isNode = (typeof window == 'undefined' || !window.window) && typeof require == 'function';

        /**
         * Error reporting source ahead length.
         * @type {number}
         */
        this.errorSourceAhead = 50;
    };

    /**
     * Definition expression
     * @type {RegExp}
     */
    Preprocessor.EXPR = /([ ]*)\/\/[ ]+#(include|ifn?def|endif|else)/g;

    /**
     * #include "path/to/file". Requires node.js' "fs" module.
     * @type {RegExp}
     */
    Preprocessor.INCLUDE = /include[ ]+"([^"\\]*(\\.[^"\\]*)*)"[ ]*\r?\n/g;

    /**
     * #ifdef/#ifndef SOMEDEFINE
     * @type {RegExp}
     */
    Preprocessor.IFDEF = /(ifn?def)[ ]+([a-zA-Z0-9_]+)[ ]*\r?\n/g;

    /**
     * #endif/#else
     * @type {RegExp}
     */
    Preprocessor.ENDIF = /(endif|else)[ ]*\r?\n/g;

    /**
     * Strips slashes from an escaped string.
     * @param {string} str Escaped string
     * @returns {string} Unescaped string
     */
    Preprocessor.stripSlashes = function(str) {
        // ref: http://phpjs.org/functions/stripslashes/
        return (str + '').replace(/\\(.?)/g, function (s, n1) {
            switch (n1) {
                case '\\': return '\\';
                case '0': return '\u0000';
                case '': return '';
                default: return n1;
            }
        });
    };

    /**
     * Indents a multi-line string.
     * @param {string} str Multi-line string to indent
     * @param {string} indent Indent to use
     * @return {string} Indented string
     */
    Preprocessor.indent = function(str, indent) {
        var lines = str.split("\n");
        for (var i=0; i<lines.length; i++) {
            lines[i] = indent + lines[i];
        }
        return lines.join("\n");
    };

    /**
     * Transforms a string for display in error messages.
     * @param {string} str String to transform
     * @returns {string}
     */
    Preprocessor.nlToStr = function(str) {
        return '['+str.replace(/\r/g, "").replace(/\n/g, "\\n")+']';
    };

    /**
     * Runs the Preprocesses.
     * @param {object.<string,string>} defines Defines
     * @param {function(string)=} verbose Print verbose processing information to the specified function as the first parameter. Defaults to not print debug information.
     * @return {string} Processed source
     * @expose
     * @throws {Error} If the source cannot be pre-processed
     */
    Preprocessor.prototype.process = function(defines, verbose) {
        defines = defines || {};
        verbose = typeof verbose == 'function' ? verbose : function() {};
        var match, match2, include, p, stack = [];
        while ((match = Preprocessor.EXPR.exec(this.source)) !== null) {
            verbose("expr: "+match[2]+" @ "+match.index+"-"+Preprocessor.EXPR.lastIndex);
            var indent = match[1];
            switch (match[2]) {
                case 'include':
                    if (!this.isNode) {
                        throw(new Error("The #include directive requires Preprocessor.js to be run in node.js"));
                    }
                    Preprocessor.INCLUDE.lastIndex = match.index;
                    if ((match2 = Preprocessor.INCLUDE.exec(this.source)) === null) {
                        throw(new Error("Illegal #"+match[2]+": "+this.source.substring(match.index, match.index+this.errorSourceAhead)+"..."));
                    }
                    include = Preprocessor.stripSlashes(match2[1]);
                    verbose("  include: "+include);
                    try {
                        include = require("fs").readFileSync(this.baseDir+"/"+include)+"";
                        this.source = this.source.substring(0, match.index)+Preprocessor.indent(include, indent)+this.source.substring(Preprocessor.INCLUDE.lastIndex);
                    } catch (e) {
                        throw(new Error("File not found: "+include+" ("+e+")"));
                    }
                    Preprocessor.EXPR.lastIndex = 0; // Start over again
                    break;
                case 'ifdef':
                case 'ifndef':
                    Preprocessor.IFDEF.lastIndex = match.index;
                    if ((match2 = Preprocessor.IFDEF.exec(this.source)) === null) {
                        throw(new Error("Illegal #"+match[2]+": "+this.source.substring(match.index, match.index+this.errorSourceAhead)+"..."));
                    }
                    verbose("  test: "+match2[2]);
                    stack.push(p={
                        "include": match2[1] == 'ifdef' ? !!defines[match2[2]] : !defines[match2[2]],
                        "index": match.index,
                        "lastIndex": Preprocessor.IFDEF.lastIndex
                    });
                    verbose("  push: "+JSON.stringify(p));
                    break;
                case 'endif':
                case 'else':
                    Preprocessor.ENDIF.lastIndex = match.index;
                    if ((match2 = Preprocessor.ENDIF.exec(this.source)) === null) {
                        throw(new Error("Illegal #"+match[2]+": "+this.source.substring(match.index, match.index+this.errorSourceAhead)+"..."));
                    }
                    if (stack.length == 0) {
                        throw(new Error("Unexpected #"+match2[1]+": "+this.source.substring(match.index, match.index+this.errorSourceAhead)+"..."));
                    }
                    var before = stack.pop();
                    verbose("  pop: "+JSON.stringify(before));
                    include = this.source.substring(before["lastIndex"], match.index);
                    if (before["include"]) {
                        verbose("  incl: "+Preprocessor.nlToStr(include));
                        this.source = this.source.substring(0, before["index"])+include+this.source.substring(Preprocessor.ENDIF.lastIndex);
                    } else {
                        verbose("  excl: "+Preprocessor.nlToStr(include));
                        include = "";
                        this.source = this.source.substring(0, before["index"])+this.source.substring(Preprocessor.ENDIF.lastIndex);
                    }
                    Preprocessor.EXPR.lastIndex = 0;
                    if (match2[1] == "else") {
                        stack.push(p={
                            "include": !before["include"],
                            "index": before["index"],
                            "lastIndex": before["index"]+include.length
                        });
                        verbose("  push: "+JSON.stringify(p));
                    }
                    break;
            }
        }
        return this.source;
    };

    /**
     * Returns a string representation of this object.
     * @return {string} String representation as of "Preprocessor"
     * @expose
     */
    Preprocessor.prototype.toString = function() {
        return "Preprocessor";
    };

    // Enable module loading if available
    if (typeof module != 'undefined' && module["exports"]) { // CommonJS
        module["exports"] = Preprocessor;
    } else if (typeof define != 'undefined' && define["amd"]) { // AMD
        define("Preprocessor", [], function() { return Preprocessor; });
    } else { // Shim
        if (!global["dcodeIO"]) {
            global["dcodeIO"] = {};
        }
        global["dcodeIO"]["Preprocessor"] = Preprocessor;
    }
    
})(this);