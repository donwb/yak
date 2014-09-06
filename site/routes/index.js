var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/loaderio-8369bf1bdbb669777ff0a1972ceabde0', function(req, res) {
	res.send('loaderio-8369bf1bdbb669777ff0a1972ceabde0');
});

module.exports = router;
