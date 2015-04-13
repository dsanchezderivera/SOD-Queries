var express = require('express');
var router = express.Router();

/* GET status page. */
router.get('/', function(req, res){
	req.db.QueryNotifications.find({"users": req.user._id},"-lastresult -query", {sort: {queryName: 1}}, function(err, notificationlist){
		for (var i in notificationlist) {
			if(notificationlist[i].usersWithChanges.indexOf(req.user._id) != -1){
				notificationlist[i].changes = true;
			}
		}
		//console.log("Getting notifications: " + notificationlist);
		res.render('status', {user: req.user, notifications: notificationlist});
	});
		
});

/* GET a specific notifiaction page. */
router.get('/:notId', function(req, res){
		req.db.QueryNotifications.findByIdAndUpdate(req.param("notId"), {$set: {changes: false}, $pull: { usersWithChanges: req.user._id }}, function(err, not){
			if(err){
				console.log("Error getting document"+err);
				req.session.error = 'Error deleting'+err;
				res.redirect('/status');
			}else{
				console.log("Fetching info for:" + not._id);
				res.render('shownotification', {user: req.user, infonotification: not});
			}	
		});
});

/* POST to delete a notification. */
router.post('/:notId/delete', function(req, res){
	console.log("Deleting!!!" + req.param("notId"));
	//Deleting notification from user
	req.db.UserDetails.update({_id: req.user._id},{$pull: { 'notifications' : req.param("notId") }}, function(err, data) {
		if(err){ 
			console.log("Error removing notification from user");
		}	
	});
	//Deleting the notification from db
	req.db.QueryNotifications.findByIdAndRemove(req.param("notId"), function(err){
		if(err){ 
			console.log("Error deleting document");
			req.session.error = 'Error deleting';
			res.redirect('/status');
		}
		else{
			console.log('Publishing delete to mqtt');
			req.mqtt.publish('deletequeriestopic', req.param("notId"));	//Publising delete to DBOperator
			req.session.success = 'Notification deleted succesfully!';
			res.redirect('/status');
		}
	});
});

/* POST a notification update  */
router.post('/:notId/edit', function(req, res){
	console.log("Editing!!!" + req.param("notId"));
	var newquery = {};
	newquery._id = req.param("notId");
	newquery.queryName = req.body.name;
	newquery.queryDescription = req.body.desc;
	newquery.queryEndpoint = req.body.endpoint;
	newquery.query = (req.body.querytext).replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g," ");
	//console.log("Edited query: " + JSON.stringify(newquery, undefined, 2));
	req.db.QueryNotifications.findByIdAndUpdate(newquery._id, 
			{$set: {queryname: newquery.queryname, queryDescription: newquery.queryDescription, queryEndpoint: newquery.queryEndpoint, query: newquery.query}}, function (err, query) {
  				if (err) console.log("Error: " + err);
  			req.mqtt.publish('updatequeriestopic', JSON.stringify(newquery, undefined, 2));
  			console.log("Published changes to updatequeriestopic");
  			req.session.success = 'Notification updated succesfully!';
  			res.redirect('/status');	
		});
});

module.exports = router;