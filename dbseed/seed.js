var config = require('.././mongo-config');
var _ = require('underscore');

config.setDev();

var db = require('./mongo');

// iteration number passed on command line
var iterationsArg = parseInt(process.argv.slice(2));
console.log(iterationsArg);
if(isNaN(iterationsArg)) {
	console.log('usage: node seed.js [iterations]');
	process.exit(1);
}

if(iterationsArg === 0) {
	db.open(function(conn){
	    db.removeAll('yaks', function doneRemovingYaks(){
	    	console.log('yaks are erased');
	    });
	});	
} else {
	db.open(function(conn){
    	var iterations = _.range(iterationsArg);
    	var count = 0
    	_.each(iterations, function(i){
    		buildJSON(function(json){
	    		db.insert(json, 'yaks', function(retValue){
	    			count++;
	            	console.log('Inserted yak #: ' + count);
	            	// Bail when done
	            	if(count === iterationsArg){
	            		process.exit(0);
	            	}
	        	});
	    	});
    	});
	});	
}


function buildJSON(func) {
	var userid = Math.floor((Math.random() * 1000) + 1);
	var region = Math.floor((Math.random() * 100) + 1);
	var score = Math.floor((Math.random() * 15) + 1);

	var data = [
	    {
	        userid: userid,
	        region: region,
	        score: score,
	        yak: "VHS messenger bag Echo Park, irony post-ironic swag plaid Truffaut trust fund ennui typewriter master cleanse ethical lomo brunch",
	        loc: {"lon":51.10682735591432,"lat":-114.11773681640625}
	    }
	];

	func(data);

}