//index.js/
var express = require('express'),
    exphbs = require('express-handlebars'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
	mongoose = require('mongoose/'),
	mqtt = require('mqtt'),
	mqttclient = mqtt.createClient(),
	Schema = mongoose.Schema;

var app = express();

//===============MONGODB===============
mongoose.connect('mongodb://localhost/appdatabase');

var Schema = mongoose.Schema;
var UserDetail = new Schema({
		username: String,
		password: String,
		email: String,
		notifications: [{type: Schema.Types.ObjectId, ref: 'QueryNotifications'}],
		admin: Boolean
    }, {
		collection: 'usercollection'
    });
var UserDetails = mongoose.model('usercollection', UserDetail);

var Group = new Schema({
		groupName: String,
		users: [{type: Schema.Types.ObjectId, ref: 'UserDetails'}]
    }, {
		collection: 'groups'
    });
var Groups = mongoose.model('groups', Group);

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

//===============PASSPORT===============

passport.serializeUser(function(user, done) {
	done(null, user._id);
});
 
passport.deserializeUser(function(id, done) {
	UserDetails.findById(id, function(err, user) {
		if(!err){
			done(err, user);
		}else{ 
			done(err,null);
		}
	});
});

passport.use('local-signin', new LocalStrategy({passReqToCallback : true}, 
	function(req, username, password, done) {
	  process.nextTick(function() {
		UserDetails.findOne({'username': username}, function(err, user) {
		  if (err) {
			console.log("ERROR");
			req.session.error = 'Could not log user in. Please try again.';
			return done(err);
		  }
	 
		  if (!user) {
		  console.log("Error; %s", err);
		  console.log("COULD NOT LOG IN NOT USER %s se encontro: %s", username, user);
        req.session.error = 'Could not log user in. Please try again.';
			return done(null, false);
		  }
	 
		  if (user.password != password) {
		  console.log("COULD NOT LOG IN BAD PASSWORD");
        req.session.error = 'Could not log user in. Please try again.';
			return done(null, false);
		  }
		  
		console.log("LOGGED IN AS: " + user.username);
        req.session.success = 'You are successfully logged in ' + user.username + '!';
		  return done(null, user);
		});
	});
}));

passport.use('local-signup', new LocalStrategy({passReqToCallback : true}, 
	function(req, username, password, done) {
	  process.nextTick(function() {
		UserDetails.findOne({'username': username}, function(err, user) {
		  if (err) {
			console.log("Error; %s", err);
			console.log("ERROR Searching existing users");
			req.session.error = 'Could not log user in. Please try again.';
			return done(err);
		  }
	 
		  if (user) {
			console.log("COULD NOT REGISTER. USED NAME");
			req.session.error = 'That username is already in use, please try a different one.';
			return done(null, null);
		  }
		  
		  var userdata = new UserDetails({
			  username: username
			, password: password
			, email: 'test@test.test'
			, admin: false
			});
		
		userdata.save(function(err,userdetail){
			if(err){ 
				console.log("Error adding document to DB");
				return done(err);
			}
		});
		
		console.log("Añadir user ok" + username);
        req.session.success = 'You are successfully logged in ' + username + '!';
		return done(null, username);
		});
	});
}));

//===============EXPRESS================
// Configure Express
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

// Configure express to use handlebars templates
var hbs = exphbs.create({
    defaultLayout: 'main',
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//===============ROUTES=================
//displays our homepage
app.get('/', function(req, res){
  res.render('home', {user: req.user});
});

//displays our signup page
app.get('/signin', function(req, res){
  res.render('signin');
});

app.get('/newquery', function(req, res){
		res.render('newquery', {user: req.user});
});

app.get('/status', function(req, res){
	QueryNotifications.find({"users": req.user._id},null, {sort: {queryName: 1}}, function(err, notificationlist){
		//console.log("Getting notifications: " + notificationlist);
		res.render('status', {user: req.user, notifications: notificationlist});
	});
		
});

app.get('/status/:notId', function(req, res){
		QueryNotifications.findOne({"_id": req.param("notId")}, function(err, not){
			console.log("Fetching info for:" + not);
			res.render('shownotification', {user: req.user, infonotification: not});
		});
});


app.get('/adminusers', function(req, res){
	Groups.find({}, {"users":1}, null, function(err, data){
		
	console.log(data);
	});
	UserDetails.find({},null, {sort: {username: 1}}, function(err, userlist){
		//console.log("Getting users: "+userlist);
		res.render('adminusers', {user: req.user, users: userlist});
	});
});

app.get('/metaquerygen', function(req, res){
		res.render('metaquerygenerator', {user: req.user});
});

app.get('/adminusers/:userId', function(req, res){
	if(req.param("admin")){
		UserDetails.findByIdAndUpdate(req.param("userId"), { $set: { admin: req.param("admin") }}, function (err, user) {
			req.session.notice = "Updated!";
			res.redirect('/adminusers');
	});}else{
		UserDetails.findOne({"_id": req.param("userId")}, function(err, user){
			console.log("Fetching info for:" + user);
			res.render('adminuser', {user: req.user, usertoadmin: user});
		});
	}
});

app.post('/status/:notId/delete', function(req, res){
	console.log("Deleting!!!" + req.param("notId"));
	UserDetails.update({_id: req.user._id},{$pull: { 'notifications' : req.param("notId") }}, function(err, data) {
		if(err){ 
			console.log("Error removing notification from user");
		}	
	});
	QueryNotifications.findByIdAndRemove(req.param("notId"), function(err){
		if(err){ 
			console.log("Error deleting document");
			req.session.error = 'Error deleting';
			res.redirect('/status');
		}
		else{
			console.log('Publishing delete to mqtt');
			mqttclient.publish('deletequeriestopic', req.param("notId"));
			req.session.success = 'Notification deleted succesfully!';
			res.redirect('/status');
		}
	});
});


app.post('/newquery', function(req, res){
	var newquery = new QueryNotifications({
		queryName: req.body.name,
		queryDescription: req.body.desc,
		queryEndpoint: req.body.endpoint,
		query: (req.body.querytext).replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g," "),
		users: [req.user._id],
		active: true,
		lastupdated: new Date,
		lastresult: "empty",
		changes: false
	});
	UserDetails.update({_id: req.user._id},{$push: { 'notifications' : newquery._id }},{upsert:true}, function(err, data) {
		if(err){ 
			console.log("Error adding document to users DB");
		}	
	});
	newquery.save(function(err,newquerydata){
		if(err){ 
			console.log("Error adding document to notifications DB at newquery");
		}
	});
	
	var jsonstring = JSON.stringify(newquery, undefined, 2);
	mqttclient.publish('newqueriestopic', jsonstring);
	console.log(jsonstring);
	res.redirect('/newquery');
});


//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', { 
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});


//===============MQTT Receive Updates=================

mqttclient.subscribe('queryupdates');
console.log("Subscribed to queryupdates Topic!");
mqttclient.on('message', function(topic, message) {
  console.log("!!!!!!!!!!!!!!!!!!!MQTT Udpate received: "+message);
  var objJson = JSON.parse(message);
  QueryNotifications.findByIdAndUpdate(objJson._id, { $set: { lastresult: objJson.lastresult }}, function (err, querydata) {
	if(!err){ 
		console.log("Update added to BD");
	}else{
		console.log("Error adding document to notifications DB from MQTT");
		}
	});
});



//===============PORT=================
var port = process.env.PORT || 5000; //select your port or let it pull from your .env file
app.listen(port);
console.log("listening on " + port + "!");