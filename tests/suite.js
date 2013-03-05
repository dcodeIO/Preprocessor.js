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
        test.equal(msgs, 'expr: ifdef @ 0-9  test: UNDEFINED  push: {"include":false,"index":0,"lastIndex":20}expr: endif @ 28-37  pop: {"include":false,"index":0,"lastIndex":20}  excl: [test();\\n]');
        test.done();
    },
    
    "test": function(test) {
        var pp = new Preprocessor(fs.readFileSync(__dirname+"/test.js"), __dirname);
        test.equal(pp.process({}).replace(/\r/, ""), '\nconsole.log("UNDEFINED is not defined");\n\nconsole.log("UNDEFINED is not defined (else)");\n');
        test.done();
    }
    
};

module.exports = suite;
