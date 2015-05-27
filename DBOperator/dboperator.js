var express = require('express'),
	mongoose = require('mongoose/'),
	mqtt = require('mqtt'),
	Schema = mongoose.Schema,
	mqttclient = mqtt.createClient(),
	http = require("http"),
	https = require("https"),
	url = require("url"),
	async = require('async');


//===============MONGODB===============
mongoose.connect('mongodb://localhost:27018/serverdatabase');

var Schema = mongoose.Schema;

var QueryNotification = new Schema({
		queryName: String,
		queryDescription: String,
		queryEndpoint: String,
		query: String,
		users: [{type: Schema.Types.ObjectId, ref: 'UserDetails'}],
		active: Boolean,
		lastupdated: { type: Date, default: Date.now },
		lastresult: String,
		changes: Boolean
    }, {
		collection: 'querynotifications'
    });

var QueryNotifications = mongoose.model('querynotifications', QueryNotification);

	
//===============MQTT===============
mqttclient.subscribe('newqueriestopic');
console.log("Subscribed to newequeriestopic");
mqttclient.subscribe('deletequeriestopic');
console.log("Subscribed to deletequeriestopic");
mqttclient.subscribe('updatequeriestopic');
console.log("Subscribed to updatequeriestopic");

mqttclient.on('message', function(topic, message, packet) {
		
	console.log("New query received on topic: "+ topic + ". Content: " + message);
	//============================NEW QUERIES=================================	
	if(topic == 'newqueriestopic'){
		var objJson = JSON.parse(message);
		var newquery = new QueryNotifications({
					_id: objJson._id,
					queryName: objJson.queryName,
					queryDescription: objJson.queryDescription,
					queryEndpoint: objJson.queryEndpoint,
					query: objJson.query,
					users: objJson.users,
					active: objJson.active,
					lastupdated: objJson.lastupdated,
					lastresult: objJson.lastresult,
					changes: objJson.changes
				});
				newquery.save(function(err,newquerydata){
					if(err){ 
						console.log("Error adding document to notifications DB on serverside");
					}
					console.log("New Query Saved!!!!!!!!!!!1");
					mqttclient.publish('queryacks', objJson._id);
				});
		console.log("ObjetoJSON.query: "+ objJson.query);
		var parseurl = url.parse(objJson.queryEndpoint);
		var options = {
				hostname: parseurl.hostname,
				path: parseurl.path+'?query=' + encodeURIComponent(objJson.query)+'&output=json',
				port: parseurl.port,
				method: 'GET',
				headers: {
    				'Accept': 'application/sparql-results+json'
 				}
			};
		console.log("STRING: "+ urlstring);
		//=========HTTPGET============== (Fetching data and publishing if ok)
		http.get(options, function(res) {
			var objJson2 = objJson;
			console.log('STATUS: ' + res.statusCode);
			console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			var body = "";
			res.on('data', function (chunk) {
				body += chunk;
			});
			res.on('end', function(){
				//console.log('BODY: ' + body);
				objJson2.lastresult = body;
				objJson2.lastupdated = new Date();
				objJson2.changes = true;
				var jsonstring = JSON.stringify(objJson2, undefined, 2);
				//console.log("OBJECT: " + jsonstring);
				console.log("Status Ok!");
				//If response ok, publish data
				mqttclient.publish('queryupdates', jsonstring);
				console.log("Published to Topic: queryupdates");
				QueryNotifications.findByIdAndUpdate(objJson2._id, { $set: { 
					lastresult: objJson2.lastresult, lastupdated: objJson2.lastupdated, changes:objJson2.changes }}, function (err, querydata) {
					if(!err){ 
						console.log("Update added to BD at first httpget");
					}else{
						console.log("Error adding document to notifications DB at first httpget");
					}
				});
			});
		}).on('error', function(e) {
			console.log("Got error: " + e.message);
		});
	}
	//=======================================UPDATE QUERIES=======================================
	else if(topic == 'updatequeriestopic'){
		console.log("Updating query: "+ message);
		var objJson = JSON.parse(message);
		QueryNotifications.findByIdAndUpdate(objJson._id, 
			{$set: {queryname: objJson.objJson, queryDescription: objJson.queryDescription, queryEndpoint: objJson.queryEndpoint, query: objJson.query}}, function (err, query) {
  				if (err) console.log("Error: " + err);
  			mqttclient.publish('queryacks', objJson._id);	
  			console.log("Udpated query on db");
		});
	}
	//======================================DELETE QUERIES========================================
	else if(topic == 'deletequeriestopic'){
		console.log("Deleting query id: "+ message);
		QueryNotifications.remove({ _id: message }, function(err) {
			if (!err) {
				console.log('Delete ok!');
			}
			else {
				console.log("Error deleting");
			}
		});
	}
});




//===========================================================================================
//===========================================================================================

//===============Compare routine===============

var repeatTime = 60000; // Time for repeat the compare routine (60000 = 1 min)

function compare() {
	console.log("Routine started");
	QueryNotifications.find({active:true}).lean().exec(function(err, cursor){

		//Wait async calls for end the current execution
		async.each(cursor,	
			function(doc,callback){
				if(doc === null) {
					callback();
					return;
				}	
				var parseurl = url.parse(doc.queryEndpoint);
				//query options
				var options = {
					hostname: parseurl.hostname,
					path: parseurl.path+'?query=' + encodeURIComponent(doc.query)+'&output=json',
					port: parseurl.port,
					method: 'GET',
					headers: {
	    				'Accept': 'application/sparql-results+json' //Accept only json results
	 				}
				};
				//console.log('URL: '+options.hostname + options.path+options.search);
				//=========HTTPGET============== (Fetching data and publishing if ok)
				http.get(options, function(res) {
					var objJson2 = doc;
					console.log('STATUS: ' + res.statusCode + '. For id: '+doc._id);
					//console.log('HEADERS: ' + JSON.stringify(res.headers));
					res.setEncoding('utf8');
					var body = "";
					res.on('data', function (chunk) {
						body += chunk;
					});
					//console.log('BODY: '+body);
					res.on('end', function(){
						if(res.statusCode == 200){
							if(body != objJson2.lastresult){
								console.log('NOT THE SAME; UPDATING AND PUBLISHING');
								objJson2.lastresult = body;
								objJson2.lastupdated = new Date();
								objJson2.changes = true;
								var jsonstring = JSON.stringify(objJson2, undefined, 2);
								//console.log("OBJECT: " + jsonstring);
								//If response ok, publish data
								mqttclient.publish('queryupdates', jsonstring);
								console.log("Published to Topic: queryupdates");
								QueryNotifications.findByIdAndUpdate(objJson2._id, { $set: { 
									lastresult: objJson2.lastresult, lastupdated: objJson2.lastupdated, changes : objJson2.changes }}, function (err, querydata) {
									if(!err){ 
										console.log("Update added to BD on serverside");
									}else{
										console.log("Error adding document to notifications DB on serverside"+ err);
									}
								});
							}else{
								console.log('SAME STRING!!');
							}
						}
						callback();
					});
				}).on('error', function(e) {
					console.log("Got error: " + e.message);
					callback();
				});
			},function(err){
   				console.log("Routine ended");
   				//set timer again
				routineTimer = setTimeout(function(){compare();}, repeatTime);
  			});
	});
}

var routineTimer = setTimeout(function(){compare();}, repeatTime);

