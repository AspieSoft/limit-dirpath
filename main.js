const Module = require('module');
const setPath = require('path');

const fse = requireOptional('fs-extra');


function requireOptional(id){
	try{
		return require(id);
	}catch(e){return undefined;}
}


class DeniedError extends Error {
	constructor(message){
		super(message);
		this.name = 'PermissionDenied';
		this.status = 403;
	}
	statusCode(){return this.status;}
}

class UndefinedError extends Error {
	constructor(message){
		super(message);
		this.name = 'Undefined';
		this.status = 403;
	}
	statusCode(){return this.status;}
}


function limitsFunctions({throwErrors = true, root = false, require = 'modules', modules = true, fs = false, eval = false}){

	let denyModules = ['fs', 'fs-extra'];

	if(typeof modules === 'object'){
		if(modules.deny){
			if(!Array.isArray(modules.deny)){modules.deny = [modules.deny];}
			denyModules = denyModules.concat(modules.deny);
		}
		if(modules.allow){
			if(!Array.isArray(modules.allow)){modules.allow = [modules.allow];}
			modules = modules.allow;
		}
	}

	const options = {throwErrors, root, require, modules, denyModules, fs, eval};

	if(options.root){options.root = setPath.resolve(options.root);}
	else if(process.mainModule && process.mainModule.filename){options.root = setPath.join(process.mainModule.filename, '..');}

	const origFunc = {
		require: Module.prototype.require,
	};


	function error(type, msg){
		if(options.throwErrors === false){
			if(type === 'undefined'){return undefined;}
			return null;
		}else{
			switch(type){
				case 'denied':
					throw new DeniedError(msg);
				case 'undefined':
					throw new UndefinedError(msg);
				default:
					throw new Error(msg);
			}
		}
	}


	function verifyRoot(filePath, callerFile, includeModules = false, noErrors = false){
		if(options.root){
			if(!filePath){
				if(noErrors){return undefined;}
				return error('undefined', 'filePath is not defined!');
			}
			let rootDir = setPath.resolve(options.root);
			if(callerFile){callerFile = setPath.join(callerFile, '..');}
			if(!callerFile || callerFile.trim() === ''){callerFile = rootDir;}
			if(filePath.startsWith('.') || (!filePath.startsWith('/') && !includeModules)){
				let dirFirstSlash = rootDir.indexOf('/');
				if(dirFirstSlash === -1){dirFirstSlash = rootDir.indexOf('\\');}
				if(!filePath.startsWith(rootDir.substring(0, dirFirstSlash))){
					filePath = setPath.join(callerFile, filePath);
				}else{filePath = setPath.resolve(filePath);}
			}else if(filePath.startsWith('/')){
				filePath = setPath.join(rootDir, filePath);
			}else if(!filePath.startsWith('/') && includeModules){
				let allow = true;
				if(options.modules){
					let modules = options.modules;
					if(modules === false){
						allow = false;
					}else if(Array.isArray(modules)){
						allow = modules.includes(filePath);
					}
				}else if(options.modules === false){
					if(noErrors){return null;}
					return error('denied', 'Modules are not allowed!');
				}
				if(allow && denyModules.length && denyModules.includes(filePath)){allow = false;}
				if(!allow){
					if(noErrors){return null;}
					return error('denied', 'That module is not allowed! module: '+filePath);
				}return {path: filePath, isModule: true};
			}else{filePath = setPath.resolve(filePath);}
			if(!filePath.startsWith(rootDir)){
				if(noErrors){return null;}
				return error('denied', 'Root access is limited to '+options.root);
			}
			let testID = filePath.replace(rootDir, '');
			if(!testID.includes('/') && !testID.includes('\\')){
				if(noErrors){return null;}
				return error('denied', 'Root access is limited to '+options.root);
			}
		}return {path: filePath, isModule: false};
	}


	Module.prototype.require = function(id){
		if(options.require === false){return error('denied', 'The require function is not allowed!');}
		let filePath = verifyRoot(id, this.filename, true);
		if(options.require === 'modules' && !filePath.isModule){return error('denied', 'The require function is limited to modules!');}
		if(!filePath){return error('undefined', 'filePath is not defined!');}
		return origFunc.require.apply(this, [id]);
	};


	if(eval !== true){
		eval = function(){return error('denied', 'Cannot use eval!');};
		if(eval !== 'global'){global.eval = eval;}
	}


	const newFunctions = {};

	if(options.fs){

		let allowedActions = options.fs;
		if(options.fs === true){
			allowedActions = ['read', 'write', 'stream', 'add', 'modify', 'append', 'delete', 'rename', 'watch', 'copy', 'move', 'exists', 'sync', 'dir', 'js', 'json'];
		}else if(!Array.isArray(allowedActions)){allowedActions = [];}

		newFunctions.fs = {};

		if(allowedActions.includes('read')){
			newFunctions.fs.readFile = function(path, options, callback){
				let filePath = verifyRoot(path, this.filename);
				if(!filePath){return error('undefined', 'filePath is not defined!');}
				filePath = filePath.path;
				if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot read js files!');}
				if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot read json files!');}
				return fse.readFile(filePath, options, callback);
			};
			if(allowedActions.includes('sync')){
				newFunctions.fs.readFileSync = function(path, options){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot read js files!');}
					if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot read json files!');}
					return fse.readFileSync(filePath, options);
				};
			}
			if(allowedActions.includes('dir')){
				newFunctions.fs.readdir = function(path, callback){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot read js files!');}
					if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot read json files!');}
					return fse.readdir(filePath, callback);
				};
				newFunctions.fs.readdirSync = function(path){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot read js files!');}
					if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot read json files!');}
					return fse.readdirSync(filePath);
				};
			}
			if(allowedActions.includes('json')){
				newFunctions.fs.readJson = function(path, callback){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					return fse.readJson(filePath, callback);
				};
				if(allowedActions.includes('sync')){
					newFunctions.fs.readJsonSync = function(path){
						let filePath = verifyRoot(path, this.filename);
						if(!filePath){return error('undefined', 'filePath is not defined!');}
						filePath = filePath.path;
						return fse.readJsonSync(filePath);
					};
				}
			}
			if(allowedActions.includes('stream')){
				newFunctions.fs.createReadStream = function(path, options){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot read js files!');}
					if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot read json files!');}
					return fse.createReadStream(filePath, options);
				};
			}
		}

		if(allowedActions.includes('write')){
			newFunctions.fs.writeFile = function(path, data, callback){
				let filePath = verifyRoot(path, this.filename);
				if(!filePath){return error('undefined', 'filePath is not defined!');}
				filePath = filePath.path;
				if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot modify js files!');}
				if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot modify json files!');}
				if(!allowedActions.includes('add') && !allowedActions.includes('modify')){
					return fse.writeFile(filePath, data, callback);
				}else{
					let fileExists = fse.existsSync(filePath);
					if(fileExists && !allowedActions.includes('modify')){
						return error('denied', 'Cannot modify existing files!');
					}else if(!fileExists && !allowedActions.includes('add')){
						return error('denied', 'Cannot add new files!');
					}
				}
				if(allowedActions.includes('dir')){fse.ensureDirSync(setPath.join(filePath, '..'));}
				return fse.writeFile(filePath, data, callback);
			};
			if(allowedActions.includes('sync')){
				newFunctions.fs.writeFileSync = function(path, data){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot modify js files!');}
					if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot modify json files!');}
					if(!allowedActions.includes('add') && !allowedActions.includes('modify')){
						return fse.writeFileSync(filePath, data);
					}else{
						let fileExists = fse.existsSync(filePath);
						if(fileExists && !allowedActions.includes('modify')){
							return error('denied', 'Cannot modify existing files!');
						}else if(!fileExists && !allowedActions.includes('add')){
							return error('denied', 'Cannot add new files!');
						}
					}
					if(allowedActions.includes('dir')){fse.ensureDirSync(setPath.join(filePath, '..'));}
					return fse.writeFileSync(filePath, data);
				};
			}
			if(allowedActions.includes('dir') && (allowedActions.includes('add') || !allowedActions.includes('modify'))){
				newFunctions.fs.mkdir = function(path, callback){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					fse.ensureDirSync(setPath.join(filePath, '..'));
					return fse.mkdir(filePath, callback);
				};
				if(allowedActions.includes('sync')){
					newFunctions.fs.mkdirSync = function(path){
						let filePath = verifyRoot(path, this.filename);
						if(!filePath){return error('undefined', 'filePath is not defined!');}
						filePath = filePath.path;
						fse.ensureDirSync(setPath.join(filePath, '..'));
						return fse.mkdirSync(filePath);
					};
				}
			}
			if(allowedActions.includes('json')){
				newFunctions.fs.writeJson = function(path, data, callback){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					if(allowedActions.includes('dir')){fse.ensureDirSync(setPath.join(filePath, '..'));}
					return fse.writeJson(filePath, data, callback);
				};
				if(allowedActions.includes('sync')){
					newFunctions.fs.writeJsonSync = function(path, data){
						let filePath = verifyRoot(path, this.filename);
						if(!filePath){return error('undefined', 'filePath is not defined!');}
						filePath = filePath.path;
						if(allowedActions.includes('dir')){fse.ensureDirSync(setPath.join(filePath, '..'));}
						return fse.writeJsonSync(filePath, data);
					};
				}
			}
			if(allowedActions.includes('stream')){
				newFunctions.fs.createWriteStream = function(path, options){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot read js files!');}
					if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot read json files!');}
					return fse.createWriteStream(filePath, options);
				};
			}
		}

		if(allowedActions.includes('delete')){
			newFunctions.fs.remove = function(path, callback){
				let filePath = verifyRoot(path, this.filename);
				if(!filePath){return error('undefined', 'filePath is not defined!');}
				filePath = filePath.path;
				if(!allowedActions.includes('dir') && !filePath.match(/\.[A-Za-z0-9]$/)){return error('denied', 'Cannot remove directories!');}
				return fse.remove(filePath, callback);
			};
			if(allowedActions.includes('sync')){
				newFunctions.fs.removeSync = function(path){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					if(!allowedActions.includes('dir') && !filePath.match(/\.[A-Za-z0-9]$/)){return error('denied', 'Cannot remove directories!');}
					return fse.removeSync(filePath);
				};
			}
			if(allowedActions.includes('dir')){
				newFunctions.fs.emptyDir = function(path, callback){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					return fse.emptyDir(filePath, callback);
				};
				if(allowedActions.includes('sync')){
					newFunctions.fs.emptyDirSync = function(path){
						let filePath = verifyRoot(path, this.filename);
						if(!filePath){return error('undefined', 'filePath is not defined!');}
						filePath = filePath.path;
						return fse.emptyDirSync(filePath);
					};
				}
			}
		}

		if(allowedActions.includes('append')){
			newFunctions.fs.appendFile = function(path, data, callback){
				let filePath = verifyRoot(path, this.filename);
				if(!filePath){return error('undefined', 'filePath is not defined!');}
				filePath = filePath.path;
				if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot modify js files!');}
				if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot modify json files!');}
				if(!allowedActions.includes('dir') && !fse.existsSync(setPath.join(filePath, '..'))){return error('undefined', 'Directory does not exist!');}
				if(allowedActions.includes('add') || (!allowedActions.includes('modify') && allowedActions.includes('write'))){fse.ensureFileSync(filePath);}
				return fse.appendFile(filePath, data, callback);
			};
			if(allowedActions.includes('sync')){
				newFunctions.fs.appendFileSync = function(path, data){
					let filePath = verifyRoot(path, this.filename);
					if(!filePath){return error('undefined', 'filePath is not defined!');}
					filePath = filePath.path;
					if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot modify js files!');}
					if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot modify json files!');}
					if(!allowedActions.includes('dir') && !fse.existsSync(setPath.join(filePath, '..'))){return error('undefined', 'Directory does not exist!');}
					if(allowedActions.includes('add') || (!allowedActions.includes('modify') && allowedActions.includes('write'))){fse.ensureFileSync(filePath);}
					return fse.appendFileSync(filePath, data);
				};
			}
		}

		if(allowedActions.includes('copy')){
			newFunctions.fs.copy = function(src, dest, callback, overwrite = false){
				src = verifyRoot(src, this.filename);
				if(!src){return error('undefined', 'src is not defined!');}
				src = src.path;
				dest = verifyRoot(dest, this.filename);
				if(!dest){return error('undefined', 'dest is not defined!');}
				dest = dest.path;
				if(!allowedActions.includes('js') && (src.endsWith('.js') || dest.endsWith('.js'))){return error('denied', 'Cannot modify js files!');}
				if(!allowedActions.includes('json') && (src.endsWith('.json') || dest.endsWith('.json'))){return error('denied', 'Cannot modify json files!');}
				let opts = {dereference: true, preserveTimestamps: true};
				opts.overwrite = allowedActions.includes('add') || (!allowedActions.includes('modify') && allowedActions.includes('write'));
				if(!overwrite){opts.overwrite = false;}
				opts.errorOnExist = options.throwErrors;
				return fse.copy(src, dest, opts, callback);
			};
			if(allowedActions.includes('sync')){
				newFunctions.fs.copySync = function(src, dest, overwrite = false){
					src = verifyRoot(src, this.filename);
					if(!src){return error('undefined', 'src is not defined!');}
					src = src.path;
					dest = verifyRoot(dest, this.filename);
					if(!dest){return error('undefined', 'dest is not defined!');}
					dest = dest.path;
					if(!allowedActions.includes('js') && (src.endsWith('.js') || dest.endsWith('.js'))){return error('denied', 'Cannot modify js files!');}
					if(!allowedActions.includes('json') && (src.endsWith('.json') || dest.endsWith('.json'))){return error('denied', 'Cannot modify json files!');}
					let opts = {dereference: true, preserveTimestamps: true};
					opts.overwrite = allowedActions.includes('add') || (!allowedActions.includes('modify') && allowedActions.includes('write'));
					if(!overwrite){opts.overwrite = false;}
					opts.errorOnExist = options.throwErrors;
					return fse.copySync(src, dest, opts);
				};
			}
		}

		if(allowedActions.includes('move')){
			newFunctions.fs.move = function(src, dest, callback, overwrite = false){
				src = verifyRoot(src, this.filename);
				if(!src){return error('undefined', 'src is not defined!');}
				src = src.path;
				dest = verifyRoot(dest, this.filename);
				if(!dest){return error('undefined', 'dest is not defined!');}
				dest = dest.path;
				if(!allowedActions.includes('js') && (src.endsWith('.js') || dest.endsWith('.js'))){return error('denied', 'Cannot modify js files!');}
				if(!allowedActions.includes('json') && (src.endsWith('.json') || dest.endsWith('.json'))){return error('denied', 'Cannot modify json files!');}
				let opts = {dereference: true, preserveTimestamps: true};
				opts.overwrite = allowedActions.includes('add') || (!allowedActions.includes('modify') && allowedActions.includes('write'));
				if(!overwrite){opts.overwrite = false;}
				opts.errorOnExist = options.throwErrors;
				return fse.move(src, dest, opts, callback);
			};
			if(allowedActions.includes('sync')){
				newFunctions.fs.moveSync = function(src, dest, overwrite = false){
					src = verifyRoot(src, this.filename);
					if(!src){return error('undefined', 'src is not defined!');}
					src = src.path;
					dest = verifyRoot(dest, this.filename);
					if(!dest){return error('undefined', 'dest is not defined!');}
					dest = dest.path;
					if(!allowedActions.includes('js') && (src.endsWith('.js') || dest.endsWith('.js'))){return error('denied', 'Cannot modify js files!');}
					if(!allowedActions.includes('json') && (src.endsWith('.json') || dest.endsWith('.json'))){return error('denied', 'Cannot modify json files!');}
					let opts = {dereference: true, preserveTimestamps: true};
					opts.overwrite = allowedActions.includes('add') || (!allowedActions.includes('modify') && allowedActions.includes('write'));
					if(!overwrite){opts.overwrite = false;}
					opts.errorOnExist = options.throwErrors;
					return fse.moveSync(src, dest, opts);
				};
			}
		}

		if(allowedActions.includes('watch')){
			newFunctions.fs.watch = function(filename, options, listener){
				let filePath = verifyRoot(filename, this.filename);
				if(!filePath){return error('undefined', 'filePath is not defined!');}
				filePath = filePath.path;
				if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot modify js files!');}
				if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot modify json files!');}
				if(!allowedActions.includes('dir') && !fse.existsSync(setPath.join(filePath, '..'))){return error('undefined', 'Directory does not exist!');}
				return fse.watch(filePath, options, listener);
			};
		}

		if(allowedActions.includes('rename')){
			newFunctions.fs.rename = function(oldPath, newPath, callback){
				oldPath = verifyRoot(oldPath, this.filename);
				if(!oldPath){return error('undefined', 'filePath is not defined!');}
				oldPath = oldPath.path;
				newPath = verifyRoot(oldPath, this.filename);
				if(!newPath){return error('undefined', 'filePath is not defined!');}
				newPath = newPath.path;
				if(!allowedActions.includes('js') && (oldPath.endsWith('.js') || newPath.endsWith('.js'))){return error('denied', 'Cannot modify js files!');}
				if(!allowedActions.includes('json') && (oldPath.endsWith('.json') || newPath.endsWith('.json'))){return error('denied', 'Cannot modify json files!');}
				if(!allowedActions.includes('dir') && (!oldPath.match(/\.[A-Za-z0-9]$/) || !newPath.match(/\.[A-Za-z0-9]$/))){return error('denied', 'Cannot remove directories!');}
				return fse.rename(oldPath, newPath, callback);
			};
			if(allowedActions.includes('sync')){
				newFunctions.fs.renameSync = function(oldPath, newPath, callback){
					oldPath = verifyRoot(oldPath, this.filename);
					if(!oldPath){return error('undefined', 'filePath is not defined!');}
					oldPath = oldPath.path;
					newPath = verifyRoot(oldPath, this.filename);
					if(!newPath){return error('undefined', 'filePath is not defined!');}
					newPath = newPath.path;
					if(!allowedActions.includes('js') && (oldPath.endsWith('.js') || newPath.endsWith('.js'))){return error('denied', 'Cannot modify js files!');}
					if(!allowedActions.includes('json') && (oldPath.endsWith('.json') || newPath.endsWith('.json'))){return error('denied', 'Cannot modify json files!');}
					if(!allowedActions.includes('dir') && (!oldPath.match(/\.[A-Za-z0-9]$/) || !newPath.match(/\.[A-Za-z0-9]$/))){return error('denied', 'Cannot remove directories!');}
					return fse.renameSync(oldPath, newPath, callback);
				};
			}
		}

		if(allowedActions.includes('exists')){
			newFunctions.fs.existsSync = function(path){
				let filePath = verifyRoot(path, this.filename, false, true);
				if(filePath === null){return null;}
				if(filePath === undefined){return undefined;}
				if(!filePath){return false;}
				filePath = filePath.path;
				if(!allowedActions.includes('js') && filePath.endsWith('.js')){return error('denied', 'Cannot modify js files!');}
				if(!allowedActions.includes('json') && filePath.endsWith('.json')){return error('denied', 'Cannot modify json files!');}
				if(!allowedActions.includes('dir') && !filePath.match(/\.[A-Za-z0-9]$/)){return error('denied', 'Cannot remove directories!');}
				return fse.existsSync(filePath);
			};
			newFunctions.fs.existsModuleSync = function(path){
				let filePath = verifyRoot(path, this.filename, true, true);
				if(filePath === null){return null;}
				if(filePath === undefined){return undefined;}
				if(!filePath){return false;}
				if(!filePath.isModule){return false;}
				filePath = filePath.path;
				if(!allowedActions.includes('js') && filePath.endsWith('.js')){return null;}
				if(!allowedActions.includes('json') && filePath.endsWith('.json')){return null;}
				if(!allowedActions.includes('dir') && !filePath.match(/\.[A-Za-z0-9]$/)){return null;}
				return fse.existsSync(filePath);
			};
		}

	}


	return newFunctions;
}

module.exports = limitsFunctions;
