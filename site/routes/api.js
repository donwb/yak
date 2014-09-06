var express = require('express');
var router = express.Router();

var mongo = require('mongoskin');
var config = require('../.././mongo-config');

var dbstring = config.dbstring;

console.log(dbstring);

router.get('/yaksForArea/:area', function(req, res) {
	var area = parseInt(req.params.area);
	//console.log(area);
	
	if(isNaN(area)) {
		var msg = req.params.area + ' is not a valid region';
		res.send({"Status": msg})
	} else {
		runQuery("region", area, 200, function(returnValue) {
			res.send(returnValue);
		});
	}
});

router.get('/yaksForUser/:userId', function(req, res){
	var user = parseInt(req.params.userId);
	//console.log(user);

	if(isNaN(user)) {
		var msg = req.params.user + ' is not a valid user';
		res.send({"Status": msg});
	} else {
		runQuery("userid", user, 200, function(returnValue) {
			res.send(returnValue);
		})
	}

});

function runQuery(field, value, limit, callback) {
	var db = mongo.db(dbstring, {native_parser: true});
	db.bind('yaks');
	if(!(isNaN(parseInt(value)))) {
		//console.log('inting this bitch');
		value = parseInt(value);
	}

	// For real the only way this works?!?!
	var key = field;
	var query = {};
	query[key] = value

	db.yaks.find(query).limit(limit).sort({_id:1}).toArray(function(err, items){
		//console.log(items);
		if(items.length === 0) {
			callback({"Status" : "User not found"});
		} else {
			callback(items);
		}

		db.close();
	});
}

module.exports = router;



