var config = require('.././mongo-config');
var mongodb = require('mongodb');
var events = require('events');
var util = require('util');

console.log ('module: ' + module.id + ' has loaded...');

var _conn = undefined;
var server = new mongodb.Server(config.mongoEndpoint, 
                                config.mongoPort, 
                                {auto_reconnect: true,
                                 poolSize:5, 
                                 socketOptions:{keepAlive:1}});

var database = new mongodb.Db(config.mongoDB, server, {safe:true});
var user = config.mongoUser;
var pass = config.mongoPassword;

var mongoIsInAnUnopenedState = function(){
  return ((_conn === undefined) || 
	        (_conn.serverConfig._serverState === 'disconnected')) && 
	       (database.serverConfig._serverState != 'connecting');
};

module.exports.open = function(func){
	if(func === undefined){
		throw ('you MUST pass in a callback to the open function. ');
	}
	var self = this;
	if(mongoIsInAnUnopenedState()){
		  database.open(function(err, conn){
			if(!err){
				if((user != undefined) && (user.length != 0)){
					conn.authenticate(user, pass, function(err2, authenticatedConn){
						if(!err2){
							_conn = conn;
							func(_conn);
							 console.log('conn was undefined or disconnected. opening...');
						}
						else{
							console.log('*** failed to authenticate against mongo!');
						}
					});
				}
				else{
					_conn = conn;
					func(_conn);
					console.log('conn was undefined or disconnected. opening...');
				}
			}
			else{
				console.log('*** failed to connect to mongo...trying again...');
				console.log('this is the error: ');
				console.log(err);
				database.open(function(err, conn){
					if(!err){
						if((user != undefined) || (user.length != 0)){
							conn.authenticate(user, pass, function(err2, authenticatedConn){
								if(!err2){
									_conn = conn;
									func(_conn); 
								}
								else{
									console.log('*** failed to authenticate against mongo!');
								}
							});
						}
						else{
							_conn = conn;
							func(_conn);
						}
					}
					else{
						console.log('*** FATAL.  failed to connect twice...');
						console.log('this is the error: ');
						console.log(err);
					}
				}); 
			}
		}); 
	}
	else{
		func(_conn);
	}

};

module.exports.addIndex = function(collectionName, index){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			coll.ensureIndex(index);
		});
	});
};

module.exports.generatePrimaryKey = function(){
	return mongodb.ObjectID.createPk();
};


module.exports.insert = function(object, collectionName, func){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function objectWasInserted(err, coll){
			var lastMod = new Date();
			var created = new Date();
			if (object instanceof Array) {
				for(var i=0;i<object.length;i++){
					object[i].lastModified = lastMod;
					object[i].created = created;
					var id = mongodb.ObjectID.createPk();
					object[i]._id = id;  
				}
			}
			else{
				object.lastModified = lastMod;
				object.created = created;
				var id = mongodb.ObjectID.createPk();
				object._id = id;  	
			}
			coll.insert(object, function(err, docs){
				if(err){
					console.log('***** error when inserting into collection!:');
					console.log(err);
					throw err;
				}
				if(func){
					if(object instanceof Array){
            func(docs);
					}
					else{
            func(docs[0]);
					}
			  }
			});
		});
	});
};

module.exports.update = function (id, object, collectionName, func){
	var self = this;
	if(object._id !== undefined){
		delete object._id;
	}
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			var objId = new mongodb.ObjectID(id.toString());
      var lastModified = new Date();

      object.lastModified = lastModified;

			coll.findAndModify({_id:new mongodb.ObjectID(id.toString())}, 
			                   [['_id','asc']], 
			                   object, 
			                   {new:true}, 
			                   function(err, object){
				if(func){
					func(object);
				}
			});
		});
	});
};
  
//
// if you have a nested document, e.g. you have an array of subdocuments
// in a field in the document, this func will cascade update all
// documents that contain this object...
//
module.exports.cascadeUpdateSubCollection = function(collectionName, 
																											subCollectionName, 
																											object, 
																											func){
	var self = this;

	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			// the id might be an object, or it might just be a string.
			// look for either...
			var queryOne = {};
			queryOne[subCollectionName + '._id'] = object._id;
			var queryTwo = {};
			queryTwo[subCollectionName + '._id'] = object._id.toString();
			
			var updateFragment = {};   
			updateFragment[subCollectionName + '.$'] = object;
			var updateStatement = {$set:updateFragment};
			
			console.log(queryOne);
			console.log(queryTwo);
			console.log(updateStatement);
			coll.update(queryOne, updateStatement, {multi:true}, function done(){
				coll.update(queryTwo, updateStatement, {multi:true}, function done(){
					func();
				});
			});
		});
	});
};

module.exports.count = function(collectionName, query, func){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			coll.find(query).count(function(err, count){
				func(count);
			});
		});
	});
};

module.exports.findOne = function(id, collectionName, func){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){		
			coll.findOne({_id: new mongodb.ObjectID(id.toString())}, function(err, doc){
				console.log('  database.js->findOne()->  found this document -> ' + doc);
				func(doc);
			});
		});
	});
}

module.exports.findAll = function(collectionName, func){
	console.log(collectionName);
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			coll.find({}).sort({lastModified: -1}).toArray(function(err, documents){
				func(documents);
			});
		});
	});
};

module.exports.find = function(collectionName, query, func){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			coll.find(query).sort({lastModified: -1}).toArray(function(err, documents){
				func(documents);
			});
		});
	});
};

module.exports.search = function(collectionName, query, fields, sort, limit, skip, func){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			var sortOptions = (sort === null) ? {lastModified: -1} : sort;
			//console.log(sortOptions);
			var maxResults =  ((limit === null) || 
			                  (limit === undefined)) ? 
			                  50 : 
			                  limit;
			var numberToSkip = ((skip === null) || (skip === undefined)) ? 0 : skip;
			var searchQuery = (query === null) ? {} : query;
			var fieldsToReturn = (fields === null) ? {} : fields;   //{};
			var cursor = coll.find(query, 
			                       fieldsToReturn, 
			                       {skip:numberToSkip, limit:maxResults, sort:sortOptions});
			if(err){
				console.log(err);
				throw err;
			}
			else{
				cursor.toArray(function(err, documents){
					if(err){
						console.log(err);
						throw err;
					}
					else{
						func(documents);
					}
				});
			}
		});
	});
};

module.exports.removeOne = function(collectionName, id, func){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){		
			coll.remove({_id: new mongodb.ObjectID(id.toString())}, function(err){
				if(func){
					func(err, {});
				}
			});
		});
	});
};

module.exports.removeAll = function(collectionName, func){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){		
			coll.remove({}, function(err){
				if(func){
					func(err);
				}
			});
		});
	});
};

module.exports.distinct = function(collectionName, field, query, filter, func){
	var self = this;
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			console.log('this is the query... ');
			console.log(query);
			coll.distinct(field, query, function distinctValues(err, values){
				if((filter !== undefined) && (filter.length > 0)){
					var returnValues = [];
					for(var i=0;i<values.length;i++){
						if(values[i].toLowerCase().substring(0, filter.length) === filter.toLowerCase()){
							returnValues.push(values[i]);
						}
					}
					func(returnValues);
				}
				else{
					func(values);
				}
			})
		});
	});
};



module.exports.updateMulti = function (query, object, collectionName, func){
	var self = this;
	if(object._id !== undefined){
		delete object._id;
	}
	self.open(function gotConnection(conn){
		conn.collection(collectionName, function(err, coll){
			coll.update(
					query,
					object,
					{multi: true},
					function(err, object) {
						if(func){
							func(object);
						}
					}
				);
		});
	});
};