var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res){
	res.render('newquery', {user: req.user});
});

router.post('/', function(req, res){
	var newquery = new req.db.QueryNotifications({
		queryName: req.body.name,
		queryDescription: req.body.desc,
		queryEndpoint: req.body.endpoint,
		query: (req.body.querytext).replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g," "),
		users: [req.user._id],
		active: true,
		lastupdated: new Date,
		lastresult: "empty",
		changes: false,
		usersWithChanges:[],
		ack: false
	});
	if(req.body.additionalUsers !=""){
		var additionalUsers = JSON.parse(req.body.additionalUsers);
		
		console.log(additionalUsers);
		var index;
		for (index = 0; index < additionalUsers.length; ++index) {
			newquery.users.push(additionalUsers[index]);
			req.db.UserDetails.update({_id: additionalUsers[index]},{$push: { 'notifications' : newquery._id }},{upsert:true}, function(err, data) {
				if(err){ 
					console.log("Error adding document to an additional user DB");
				}	
			});
		}
	}
	req.db.UserDetails.update({_id: req.user._id},{$push: { 'notifications' : newquery._id }},{upsert:true}, function(err, data) {
		if(err){ 
			console.log("Error adding document to users DB");
		}	
	});
	newquery.save(function(err,newquerydata){
		if(err){ 
			console.log("Error adding document to notifications DB from newquery POST");
		}else{
			console.log("New Query Notification added to DB from new query POST");
		}
	});
	
	var jsonstring = JSON.stringify(newquery, undefined, 2);
	req.mqtt.publish('newqueriestopic', jsonstring);
	console.log(jsonstring);
	res.redirect('/newquery');
});

module.exports = router;