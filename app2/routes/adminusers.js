var express = require('express');
var router = express.Router();

router.get('/', function(req, res){
	req.db.Groups.find({}, {"users":1}, null, function(err, data){
		
	console.log(data);
	});
	req.db.UserDetails.find({},null, {sort: {username: 1}}, function(err, userlist){
		//console.log("Getting users: "+userlist);
		res.render('adminusers', {user: req.user, users: userlist});
	});
});

router.get('/admin/:userId', function(req, res){
	if(req.param("admin")){
		req.db.UserDetails.findByIdAndUpdate(req.param("userId"), { $set: { admin: req.param("admin") }}, function (err, user) {
			req.session.notice = "Updated!";
			res.redirect('/adminusers');
	});}else{
		req.db.UserDetails.findOne({"_id": req.param("userId")}, function(err, user){
			console.log("Fetching info for:" + user);
			res.render('adminuser', {user: req.user, usertoadmin: user});
		});
	}
});

router.get('/search', function(req, res) {
		req.db.UserDetails.find({"username": new RegExp(req.param('hint'), "i")}, 'username',function(err,names){
			res.send(names);
		});
});

module.exports = router;