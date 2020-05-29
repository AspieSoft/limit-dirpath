## Method Limiter

![npm](https://img.shields.io/npm/v/@aspiesoft/limit-dirpath)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/@aspiesoft/limit-dirpath)
![GitHub top language](https://img.shields.io/github/languages/top/aspiesoft/limit-dirpath)
![NPM](https://img.shields.io/npm/l/@aspiesoft/limit-dirpath)

![npm](https://img.shields.io/npm/dw/@aspiesoft/limit-dirpath)
![npm](https://img.shields.io/npm/dm/@aspiesoft/limit-dirpath)

[![paypal](https://img.shields.io/badge/buy%20me%20a%20coffee-paypal-blue)](https://buymeacoffee.aspiesoft.com/)

Set a directory limit for require and fs functions.

**Notice: This module should Not be relied on for security on its own.
You should Never depend on this module to block unknown users from a directory.
This module is build so you can easily try to limit yourself from accidentally exiting a directory, or to limit admins to a specific root, but that does Not mean it will always work.**

### Installation

```shell script
npm install @aspiesoft/limit-dirpath
```

### Setup

```js
const LimitDirpath = require('@aspiesoft/limit-dirpath');
```

### Usage

```js
// options, and their defaults
LimitDirpath({
    throwErrors: true,
    root: false,
    require: 'modules',
    modules: true,
    fs: false,
    eval: false,
});


// to include a root limited fs function
const fs = LimitDirpath({root: __dirname, fs: true}).fs;
```

#### Note: anything that runs before this function, will not be limited

throwErrors
 - If `true`, will through errors.
 - If `false`, will return null or undefined.

root
 - Set to a dir path to limit file requests to that path.
 - If `false`, will try to grab the dirname from the main file.

require
 - This node module modifies the default require function, to help add limits.
 There are also a few options for this.
 - If `true`, will allow any file within the root option you set.
 - If `false`, will try to completely disable the require function.
 - Set to `'module'`, to attempt to only allow node_modules to be required.

modules
 - There are some additional options to control requiring modules.
 - If `true`, will allow any node_module to be required.
 - If `false`, will try to block any node_modules from being required.
 - Set to an `array`, to only allow node_modules mentioned in that list.
 - Set to an `object`, to use `array` lists: `allow` and `deny`.

fs
 - This node module can generate a new, and limited fs function.
 It cannot override the original fs module, the modules fs and fs-extra will not be allowed.
 You should manually deny any other modules, or only allow specific ones.
 This module uses fs-extra to add some extra capabilities to make up for the permission restrictions.
 - If `false`, fs is not added.
 - If `true`, a root limited fs object will be returned from the function, with all fs actions allowed by default
 - If an `array`, you can list what fs actions are allowed.
   - `['read', 'write', 'stream', 'add', 'modify', 'append', 'delete', 'rename', 'watch', 'copy', 'move', 'exists', 'sync', 'dir', 'js', 'json']`
   - read: allows reading files
     - stream: can createReadStream
   - write: allows writing to files
     - stream: can createWriteStream
     - add: can add new files
     - modify: can modify existing files
     - if add and modify are not included, but write is, there both assumed as true
     - append: can append to a file
   - delete: can delete files
   - rename: can rename files
   - watch: can watch files
   - copy: can copy files
   - move: can move files
   - exists: can check if files exist
   - sync: can run readSync, writeSync, ect.
   - dir: can do similar allowed actions with directories
   - js: can run methods on files that end with `.js`
   - json: can run methods on files that end with `.json`

eval
 - If `true`, will allow eval to be used.
 - If `false`, will override the eval function, with a permission denied function.
 - If `'global'`, will override `eval`, but not `global.eval`.
