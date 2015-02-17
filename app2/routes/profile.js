var express = require('express');
var router = express.Router();
var crypto = require('crypto');

router.get('/', function(req, res){
	res.render('profile', {user: req.user});
});

router.post('/edit/', function(req, res){
	//Check if old pass is correct
	if(req.body.currentpassword == ""){
		req.session.error = 'Remember to put yout old password.';
		res.redirect('/profile');
	}else{
		var  md5pass = crypto.createHash('md5').update(req.body.currentpassword).digest("hex"); 
		if(req.user.password == md5pass){
			var newpass = req.user.password;
			if(req.body.newpassword != ""){ //if new pass is blank leave old pass
				newpass = crypto.createHash('md5').update(req.body.newpassword).digest("hex");
			}
			req.db.UserDetails.findByIdAndUpdate(req.user._id, 
				{$set: {firstname: req.body.firstname, lastname: req.body.lastname, email: req.body.email, password: newpass}}, function (err, query) {
					if(err){ 
						console.log("Error: " + err);
						req.session.error = 'Error updating values.';
						res.redirect('/profile');
					}else{
						console.log("Values updated!");
						req.session.success = 'Profile updated succesfully!';
						res.redirect('/profile');
					}	
				});
		}else{
			req.session.error = 'Old password is not the same, please try again!';
			res.redirect('/profile');
		}
	}
});

router.get('/search', function(req, res) {
	req.db.UserDetails.find({"username": new RegExp(req.param('hint'), "i")}, 'username',function(err,names){
		res.send(names);
	});
});

module.exports = router;