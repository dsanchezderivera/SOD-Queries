var express = require('express');
var router = express.Router();

router.get('/', function(req, res){
	req.db.QueryNotifications.find({"users": req.user._id},null, {sort: {queryName: 1}}, function(err, notificationlist){
		//console.log("Getting notifications: " + notificationlist);
		res.render('status', {user: req.user, notifications: notificationlist});
	});
		
});

router.get('/:notId', function(req, res){
		req.db.QueryNotifications.findOne({"_id": req.param("notId")}, function(err, not){
			console.log("Fetching info for:" + not);
			res.render('shownotification', {user: req.user, infonotification: not});
		});
});

router.post('/:notId/delete', function(req, res){
	console.log("Deleting!!!" + req.param("notId"));
	req.db.UserDetails.update({_id: req.user._id},{$pull: { 'notifications' : req.param("notId") }}, function(err, data) {
		if(err){ 
			console.log("Error removing notification from user");
		}	
	});
	req.db.QueryNotifications.findByIdAndRemove(req.param("notId"), function(err){
		if(err){ 
			console.log("Error deleting document");
			req.session.error = 'Error deleting';
			res.redirect('/status');
		}
		else{
			console.log('Publishing delete to mqtt');
			req.mqtt.publish('deletequeriestopic', req.param("notId"));
			req.session.success = 'Notification deleted succesfully!';
			res.redirect('/status');
		}
	});
});

module.exports = router;