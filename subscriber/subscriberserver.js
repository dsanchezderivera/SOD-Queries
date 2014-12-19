var express = require('express'),
	mongoose = require('mongoose/'),
	mqtt = require('mqtt'),
	Schema = mongoose.Schema,
	mqttclient = mqtt.createClient(),
	http = require("http"),
	https = require("https");
	
	
	
	
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

mqttclient.on('message', function(topic, message, packet) {
		
	console.log("New query received on topic: "+ topic + ". Content: " + message);
	//============================NEW QUERIES=================================	
	if(topic == 'newqueriestopic'){
		var objJson = JSON.parse(message);
		console.log("ObjetoJSON.query: "+ objJson.query);
		var options = {
			hostname: objJson.queryEndpoint,
			path: ("?query=" + encodeURIComponent(objJson.query)) ,
			method: 'GET'
		};
		var urlstring = options.hostname + options.path;
		console.log("STRING: "+ urlstring);
		//=========HTTPGET============== (Fetching data and publishing if ok)
		http.get(urlstring, function(res) {
			var objJson2 = objJson;
			console.log('STATUS: ' + res.statusCode);
			console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			var body = "";
			res.on('data', function (chunk) {
				body += chunk;
			});
			res.on('end', function(){
				console.log('BODY: ' + body);
				objJson2.lastresult = body;
				objJson2.lastupdated = new Date;
				objJson2.changes = true;
				var jsonstring = JSON.stringify(objJson2, undefined, 2);
				//console.log("OBJECT: " + jsonstring);
				console.log("Status Ok!");
				//If response ok, publish data
				mqttclient.publish('queryupdates', jsonstring);
				console.log("Published to Topic: queryupdates");
				var newquery = new QueryNotifications({
					_id: objJson2._id,
					queryName: objJson2.queryName,
					queryDescription: objJson2.queryDescription,
					queryEndpoint: objJson2.queryEndpoint,
					query: objJson2.query,
					users: objJson2.users,
					active: objJson2.active,
					lastupdated: objJson2.lastupdated,
					lastresult: objJson2.lastresult,
					changes: objJson2.changes
				});
				newquery.save(function(err,newquerydata){
					if(err){ 
						console.log("Error adding document to notifications DB on serverside");
					}
				});
			})
		}).on('error', function(e) {
			console.log("Got error: " + e.message);
		});
	}
	//=======================================UPDATE QUERIES=======================================
	else if(topic == 'updatequeriestopic'){}
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

//=======================================UPDATE QUERIES=======================================









//===========================================================================================
//===========================================================================================

//===============Compare routine===============
var repeatTime = 10000;
var routineTimer = setTimeout(function() {
	console.log("Routine started");
	QueryNotifications.collection.find({active:true}, function(err, cursor){
	
		cursor.each (function(err,doc){
			if(doc === null) {
				return;
			}	
			//console.log(doc);
			var options = {
				hostname: doc.queryEndpoint,
				path: ("?query=" + encodeURIComponent(doc.query)) ,
				method: 'GET'
			};
			var urlstring = options.hostname + options.path;
			//console.log("EXECUTING STRING!!!!!!!!!!!!: "+ urlstring);
			//=========HTTPGET============== (Fetching data and publishing if ok)
			http.get(urlstring, function(res) {
				var objJson2 = doc;
				console.log('STATUS: ' + res.statusCode);
				//console.log('HEADERS: ' + JSON.stringify(res.headers));
				res.setEncoding('utf8');
				var body = "";
				res.on('data', function (chunk) {
					body += chunk;
				});
				res.on('end', function(){
					if(res.statusCode == 200){
						if(body != objJson2.lastresult){
							console.log('NOT THE SAME; UPDATING AND PUBLISHING');
							objJson2.lastresult = body;
							objJson2.lastupdated = new Date;
							objJson2.changes = true;
							var jsonstring = JSON.stringify(objJson2, undefined, 2);
							console.log("OBJECT: " + jsonstring);
							//If response ok, publish data
							mqttclient.publish('queryupdates', jsonstring);
							console.log("Published to Topic: queryupdates");
							var newquery = new QueryNotifications({
								_id: objJson2._id,
								queryName: objJson2.queryName,
								queryDescription: objJson2.queryDescription,
								queryEndpoint: objJson2.queryEndpoint,
								query: objJson2.query,
								users: objJson2.users,
								active: objJson2.active,
								lastupdated: objJson2.lastupdated,
								lastresult: objJson2.lastresult,
								changes: objJson2.changes
							});
							newquery.save(function(err,newquerydata){
								if(err){ 
								console.log("Error adding document to notifications DB on serverside");
								}
							});
						}else{
							console.log('SAME STRING!!');
						}
					}
				})
			}).on('error', function(e) {
				console.log("Got error: " + e.message);
			});
		});
	});
	console.log("Routine ended");
	routineTimer = setTimeout(arguments.callee, repeatTime*4);
}, repeatTime);

