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
     * @param {string|Object.<string,string>=} baseDirOrIncludes Source base directory used for includes (node.js only)
     *  or an object containing all the included sources by filename. Defaults to the current working directory.
     * @constructor
     */
    var Preprocessor = function Preprocessor(source, baseDirOrIncludes) {

        /**
         * Source code to pre-process.
         * @type {string}
         * @expose
         */
        this.source = ""+source;

        /**
         * Source base directory.
         * @type {string}
         * @expose
         */
        this.baseDir = typeof baseDirOrIncludes == 'string' ? baseDirOrIncludes : ".";

        /**
         * Included sources by filename.
         * @type {Object.<string, string>}
         */
        this.includes = typeof baseDirOrIncludes == 'object' ? baseDirOrIncludes : {};

        /**
         * Whether running inside of node.js or not.
         * @type {boolean}
         * @expose
         */
        this.isNode = (typeof window == 'undefined' || !window.window) && typeof require == 'function';

        /**
         * Error reporting source ahead length.
         * @type {number}
         * @expose
         */
        this.errorSourceAhead = 50;
    };

    /**
     * Definition expression
     * @type {RegExp}
     */
    Preprocessor.EXPR = /([ ]*)\/\/[ ]+#(include|ifn?def|if|endif|else|elif|put)/g;

    /**
     * #include "path/to/file". Requires node.js' "fs" module.
     * @type {RegExp}
     */
    Preprocessor.INCLUDE = /include[ ]+"([^"\\]*(\\.[^"\\]*)*)"[ ]*(?:\r|\n|$)/g;

    /**
     * #ifdef/#ifndef SOMEDEFINE, #if EXPRESSION
     * @type {RegExp}
     */
    Preprocessor.IF = /(ifdef|ifndef|if)[ ]*([^\r\n]+)\r?\n/g;

    /**
     * #endif/#else, #elif EXPRESSION
     * @type {RegExp}
     */
    Preprocessor.ENDIF = /(endif|else|elif)([ ]+[^\r\n]+)?\r?\n/g;

    /**
     * #put EXPRESSION
     * @type {RegExp}
     */
    Preprocessor.PUT = /put[ ]+([^\n]+)[ ]*/g;

    /**
     * Strips slashes from an escaped string.
     * @param {string} str Escaped string
     * @return {string} Unescaped string
     * @expose
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
     * Adds slashes to an unescaped string.
     * @param {string} str Unescaped string
     * @return {string} Escaped string
     * @expose
     */
    Preprocessor.addSlashes = function(str) {
        return (str+'').replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0");
    };

    /**
     * Indents a multi-line string.
     * @param {string} str Multi-line string to indent
     * @param {string} indent Indent to use
     * @return {string} Indented string
     * @expose
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
     * @return {string}
     * @expose
     */
    Preprocessor.nlToStr = function(str) {
        return '['+str.replace(/\r/g, "").replace(/\n/g, "\\n")+']';
    };
    
    /**
     * Evaluates an expression.
     * @param {object.<strin,string>} defines Defines
     * @param {string} expr Expression to evaluate
     * @return {*} Expression result
     * @throws {Error} If the expression cannot be evaluated
     * @expose
     */
    Preprocessor.evaluate = function(defines, expr) {
        var addSlashes = Preprocessor.addSlashes;
        return (function(defines, expr) {
            var Preprocessor = null;
            for (var key in defines) {
                if (defines.hasOwnProperty(key)) {
                    eval("var "+key+" = \""+addSlashes(""+defines[key])+"\";");
                }
            }
            return eval(expr);
        }).bind(null)(defines, expr);
    };

    /**
     * Runs the Preprocesses.
     * @param {object.<string,string>} defines Defines
     * @param {function(string)=} verbose Print verbose processing information to the specified function as the first parameter. Defaults to not print debug information.
     * @return {string} Processed source
     * @throws {Error} If the source cannot be pre-processed
     * @expose
     */
    Preprocessor.prototype.process = function(defines, verbose) {
        defines = defines || {};
        verbose = typeof verbose == 'function' ? verbose : function() {};
        verbose("Defines: "+JSON.stringify(defines));
        
        var match, match2, include, p, stack = [];
        while ((match = Preprocessor.EXPR.exec(this.source)) !== null) {
            verbose(match[2]+" @ "+match.index+"-"+Preprocessor.EXPR.lastIndex);
            var indent = match[1];
            switch (match[2]) {
                case 'include':
                    Preprocessor.INCLUDE.lastIndex = match.index;
                    if ((match2 = Preprocessor.INCLUDE.exec(this.source)) === null) {
                        throw(new Error("Illegal #"+match[2]+": "+this.source.substring(match.index, match.index+this.errorSourceAhead)+"..."));
                    }
                    include = Preprocessor.stripSlashes(match2[1]);
                    verbose("  incl: "+include);
                    if (typeof this.includes[include] != 'undefined') { // Do we already know it?
                        include = this.includes[include];
                    } else { // Load it if in node.js...
                        if (!this.isNode) {
                            throw(new Error("Failed to resolve include: "+this.baseDir+"/"+include));
                        }
                        try {
                            var key = include;
                            include = require("fs").readFileSync(this.baseDir+"/"+include)+"";
                            this.includes[key] = include;
                        } catch (e) {
                            throw(new Error("File not found: "+include+" ("+e+")"));
                        }
                    }
                    this.source = this.source.substring(0, match.index)+Preprocessor.indent(include, indent)+this.source.substring(Preprocessor.INCLUDE.lastIndex);
                    Preprocessor.EXPR.lastIndex = stack.length > 0 ? stack[stack.length-1].lastIndex : 0; // Start over again
                    verbose("  continue at "+Preprocessor.EXPR.lastIndex);
                    break;
                case 'put':
                    Preprocessor.PUT.lastIndex = match.index;
                    if ((match2 = Preprocessor.PUT.exec(this.source)) === null) {
                        throw(new Error("Illegal #"+match[2]+": "+this.source.substring(match.index, match.index+this.errorSourceAhead)+"..."));
                    }
                    include = match2[1];
                    verbose("  expr: "+match2[1]);
                    include = Preprocessor.evaluate(defines, match2[1]);
                    verbose("  value: "+Preprocessor.nlToStr(include));
                    this.source = this.source.substring(0, match.index)+indent+include+this.source.substring(Preprocessor.PUT.lastIndex);
                    Preprocessor.EXPR.lastIndex = match.index + include.length;
                    verbose("  continue at "+Preprocessor.EXPR.lastIndex);
                    break;
                case 'ifdef':
                case 'ifndef':
                case 'if':
                    Preprocessor.IF.lastIndex = match.index;
                    if ((match2 = Preprocessor.IF.exec(this.source)) === null) {
                        throw(new Error("Illegal #"+match[2]+": "+this.source.substring(match.index, match.index+this.errorSourceAhead)+"..."));
                    }
                    verbose("  test: "+match2[2]);
                    if (match2[1] == "ifdef") {
                        include = !!defines[match2[2]];
                    } else if (match2[1] == "ifndef") {
                        include = !defines[match2[2]];
                    } else {
                        include = Preprocessor.evaluate(defines, match2[2]);
                    }
                    verbose("  value: "+include);
                    stack.push(p={
                        "include": include,
                        "index": match.index,
                        "lastIndex": Preprocessor.IF.lastIndex
                    });
                    verbose("  push: "+JSON.stringify(p));
                    break;
                case 'endif':
                case 'else':
                case 'elif':
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
                        verbose("  incl: "+Preprocessor.nlToStr(include)+", 0-"+before['index']+" + "+include.length+" bytes + "+Preprocessor.ENDIF.lastIndex+"-"+this.source.length);
                        this.source = this.source.substring(0, before["index"])+include+this.source.substring(Preprocessor.ENDIF.lastIndex);
                    } else {
                        verbose("  excl: "+Preprocessor.nlToStr(include)+", 0-"+before['index']+" + "+Preprocessor.ENDIF.lastIndex+"-"+this.source.length);
                        include = "";
                        this.source = this.source.substring(0, before["index"])+this.source.substring(Preprocessor.ENDIF.lastIndex);
                    }
                    if (this.source == "") {
                        verbose("  result empty");
                    }
                    Preprocessor.EXPR.lastIndex = before["index"]+include.length;
                    verbose("  continue at "+Preprocessor.EXPR.lastIndex);
                    if (match2[1] == "else" || match2[1] == "elif") {
                        if (match2[1] == 'else') {
                            include = !before["include"];
                        } else {
                            include = Preprocessor.evaluate(defines, match2[2]);
                        }
                        stack.push(p={
                            "include": !before["include"],
                            "index": Preprocessor.EXPR.lastIndex,
                            "lastIndex": Preprocessor.EXPR.lastIndex
                        });
                        verbose("  push: "+JSON.stringify(p));
                    }
                    break;
            }
        }
        if (stack.length > 0) {
            before = stack.pop();
            verbose("Still on stack: "+JSON.stringify(before));
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
