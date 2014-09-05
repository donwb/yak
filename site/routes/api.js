var express = require('express');
var router = express.Router();

var mongo = require('mongoskin');
var config = require('../.././mongo-config');

var dbstring = config.dbstring;

console.log(dbstring);

router.get('/yaksForArea/:area', function(req, res) {
	var area = req.params.area;
	console.log(area);

  	

  	var db = mongo.db(dbstring, {native_parser: true});
	db.bind('yaks');

	db.yaks.find({"region": 98}).toArray(function(err, items){
		if(items.length === 0) {
			res.send({"Status" : "Region not found"});
		} else {
			res.send({region: items});
		}

		db.close();
	});


});

module.exports = router;