const miniforge = require('miniforge-js');

miniforge.rootDir(__dirname);

miniforge.build('./main.js', {outputNameMin: true, compress: false});

const path = require('path');
const fs = require('fs');
let data = fs.readFileSync(path.join(__dirname, 'main.min.js'));
if(data){
	data = data.toString()
	.replace(/[\n\r\t\s]/gs, ' ')
	.replace(/\s+/gs, ' ');
	fs.writeFileSync(path.join(__dirname, 'main.min.js'), data);
}

console.log('Finished Build');

const app = require('./index');
const test = require('./test/test');
test(app);
