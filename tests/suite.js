/*
 * Copyright 2012 The Closure Compiler Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Preprocessor.js Test Suite.
 * @author Daniel Wirtz <dcode@dcode.io>
 */

var Preprocessor = require(__dirname+"/../Preprocessor.min.js"),
    fs = require("fs");

var suite = {
    
    "init": function(test) {
        test.ok(typeof Preprocessor == 'function');
        test.done();
    },
    
    "verbose": function(test) {
        var pp = new Preprocessor("// #ifdef UNDEFINED\ntest();\n// #endif\n");
        var msgs = "";
        pp.process({}, function(msg) { msgs += msg; });
        test.ok(msgs.length > 0);
        test.done();
    },
    
    "evaluate": function(test) {
        var defines = {"VERSION": "1.0"};
        test.equal('"'+defines["VERSION"]+'";', Preprocessor.evaluate(defines, "'\"'+VERSION+'\";'"));
        test.equal('"'+"Hello world!"+'";', Preprocessor.evaluate(defines, "\"\\\"Hello world!\\\";\";"));
        test.equal("2;", Preprocessor.evaluate(defines, "(1+1)+\";\""));
        test.done();
    },
    
    "test1": function(test) {
        var pp = new Preprocessor(fs.readFileSync(__dirname+"/test1.js"), __dirname);
        var src = pp.process({"VERSION": "1.0"}, console.log).replace(/\r/, "");
        test.equal(src, '\nconsole.log("UNDEFINED is not defined");\n\nconsole.log("UNDEFINED is not defined (else)");\n\nvar version = "1.0";\n');
        test.done();
    },

    "test2": function(test) {
        var pp = new Preprocessor(fs.readFileSync(__dirname+"/test2.js"), __dirname);
        var src = pp.process({"VERSION": "1.0"}, console.log).replace(/\r/, "");
        test.equal(src, '    console.log("2==2")\n    console.log("VERSION=="+"1.0");\n');
        test.done();
    }
    
};

module.exports = suite;
