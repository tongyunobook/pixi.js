const fs = require('fs');
const isphy = global.process.argv[2] === 'phy' ? true : false;
let resourcePath = './scripts/';
if (isphy) {
  resourcePath += 'Resource_phy.js';
} else {
  resourcePath += 'Resource.js'; 
}
fs.writeFileSync('./node_modules/resource-loader/lib/Resource.js', fs.readFileSync(resourcePath));