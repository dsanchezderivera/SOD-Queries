var	mongoose = require('mongoose/'),
	crypto = require('crypto'),
	Schema = mongoose.Schema;
	
//Create and admin user for the notification system

//===============MONGODB===============
mongoose.connect('mongodb://localhost/appdatabase');

var QueryNotification = new Schema({
		queryName: String,
		queryDescription: String,
		queryEndpoint: String,
		query: String,
		users: [{type: Schema.Types.ObjectId, ref: 'UserDetails'}],
		active: Boolean,
		lastupdated: { type: Date, default: Date.now },
		lastresult: String,
		changes: Boolean,
		usersWithChanges: [{type: Schema.Types.ObjectId, ref: 'UserDetails'}],
		ack: Boolean
    }, {
		collection: 'querynotifications'
    });
var QueryNotifications = mongoose.model('querynotifications', QueryNotification);

var UserDetail = new Schema({
		username: String,
		password: String,
		firstname: String,
		lastname: String,
		email: String,
		level: Number,
		notifications: [{type: Schema.Types.ObjectId, ref: 'QueryNotifications'}],
		admin: Boolean
    }, {
		collection: 'usercollection'
    });
var UserDetails = mongoose.model('usercollection', UserDetail);

console.log("Creating admin user with password secret...");

var  md5pass = crypto.createHash('md5').update('secret').digest("hex");
var userdata = new dbmodel.UserDetails({
  username: 'admin'
, password: md5pass
, email: 'admin@example.com'
, firstname: 'Admin'
, lastname: 'Administrator'
, admin: true
});
console.log("Adding to users DB");
userdata.save(function(err,user){
	if(err){ 
		console.log("Error adding user to DB, check DB");
		return done(err);
	}else{
		console.log("Admin user added!");
	}
});

