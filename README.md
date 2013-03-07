Preprocessor.js - A JavaScript preprocessor [![Build Status](https://travis-ci.org/dcodeIO/Preprocessor.js.png?branch=master)](https://travis-ci.org/dcodeIO/Preprocessor.js)
===========================================
Provides a JavaScript source file preprocessor, e.g. to build different versions of a library. It's for example used to
build [ProtoBuf.js](https://github.com/dcodeIO/ProtoBuf.js) (its [build](https://github.com/dcodeIO/ProtoBuf.js/blob/master/build.js)
and [main script](https://github.com/dcodeIO/ProtoBuf.js/blob/master/src/ProtoBuf.js) are quite good examples).

Directives
----------
* Includes (not available when run in the browser, always relative to `baseDirectory`):

 ```javascript
 ...
 // #include "path/to/file.js"`
 ...
 ```

* Static conditions:

 ```javascript
 // #ifdef FULL
 console.log("Including extension");
 // #include "path/to/extension.js"
 // #else
 console.log("Not including extension");
 // #endif
 ```
 
* Inverse static conditions:

 ```javascript
 // #ifndef FULL
 console.log("Not including extension");
 // #else
 console.log("Including extension");
 // #include "path/to/extension.js"
 // #endif
 ```
 
* Evaluable conditions:
 
 ```javascript
 // #if 1==2
 console.log("1==2");
 // #elif 2==2
 console.log("2==2");
 // #endif
 
* Writing the result of evaluated expressions:

  ```javascript
  var version = // #put '"'+VERSION+'";"
  var str = // #put "\"Hello world!\";";
  var onePlusOne = // #put (1+1)+";"
  ```
 
Features
--------
* [CommonJS](http://www.commonjs.org/) compatible
* [RequireJS](http://requirejs.org/)/AMD compatible
* Shim compatible (include the script, then use var ByteBuffer = dcodeIO.ByteBuffer;)
* [node.js](http://nodejs.org) compatible, also available via [npm](https://npmjs.org/package/preprocessor)
* [Closure Compiler](https://developers.google.com/closure/compiler/) ADVANCED_OPTIMIZATIONS compatible (fully annotated,
`Preprocessor.min.js` has been compiled this way, `Preprocessor.min.map` is the source map)
* Fully documented using [jsdoc3](https://github.com/jsdoc3/jsdoc)
* Well tested through [nodeunit](https://github.com/caolan/nodeunit)
* Zero production dependencies
* Small footprint

Usage
-----
Install via npm: `npm -g install preprocessor`

#### Command line ####

Usage: `preprocess sourceFile [baseDirectory] [-myKey[=myValue], ...] [> outFile]`

```bash
preprocess Source.js . -FULL=true > Source.full.js
```

#### node.js / CommonJS ####

```javascript
var Preprocessor = require("preprocessor");

var source = "...";
var pp = new Preprocessor(source, ".");
console.log(pp.process({
    FULL: true
}));
```

#### RequireJS / AMD ####

```javascript
var Preprocessor = require("/path/to/Preprocessor.js");
var source = "...";
var pp = new Preprocessor(source, ".");
console.log(pp.process({
    FULL: true
}));
```

#### Browser / shim ####
Note: The `#include` directive is not available when run in the browser.

```html
<script src="//raw.github.com/dcodeIO/Preprocessor.js/master/Preprocessor.min.js"></script>
```

```javascript
var Preprocessor = dcodeIO.Preprocessor;
var source = "...";
var pp = new Preprocessor(source);
alert(pp.process({
    FULL: true
}));
```

Downloads
---------
* [ZIP-Archive](https://github.com/dcodeIO/Preprocessor.js/archive/master.zip)
* [Tarball](https://github.com/dcodeIO/Preprocessor.js/tarball/master)

Documentation
-------------
* [View documentation](http://htmlpreview.github.com/?http://github.com/dcodeIO/Preprocessor.js/master/docs/Preprocessor.html)

Tests (& Examples)
------------------
* [View source](https://github.com/dcodeIO/Preprocessor.js/blob/master/tests/suite.js)
* [View report](https://travis-ci.org/dcodeIO/Preprocessor.js)

License
-------
Apache License, Version 2.0 - http://www.apache.org/licenses/LICENSE-2.0.html
