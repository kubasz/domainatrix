const express = require('express');
const app = express();
const routes = require('./server/routes.js');

// fallthrough to static files
app.use(express.static('static'))

routes.makeRoutes().then(subapp => {
	app.use(subapp);

	app.get('*', (req, res) => {
		res.status = 404;
		res.send('');
	});

	app.listen(8080);
})
