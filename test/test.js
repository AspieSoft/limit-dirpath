function runTest(LimitDirpath){

	const fs = LimitDirpath({
		throwErrors: false,
		root: __dirname+'/test',
		require: true,
		modules: true,
		fs: false,
		eval: false,
	}).fs;

	require('./test1');

	eval('throw new Error("Eval should not be able to run!");');

	let data;
	try{
		data = fs.readFileSync('./test.txt').toString();
	}catch(e){data = false;}
	if(data){throw new Error('Reading file test.txt should be denied!');}

}

module.exports = runTest;
