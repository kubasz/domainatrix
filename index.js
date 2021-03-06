const express = require('express');
const app = express();
const routes = require('./server/routes.js');

// fallthrough to static files
app.use(express.static(__dirname + '/static'));

routes.makeRoutes().then(subapp => {
	app.use(subapp);

	app.get('*', (req, res) => {
		res.status = 404;
		res.send('');
	});

});

if (process.argv.includes("-d")) app.listen(8080);
exports = module.exports = app;
