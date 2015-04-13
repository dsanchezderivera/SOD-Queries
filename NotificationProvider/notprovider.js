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
	crypto = require('crypto'),
	Schema = mongoose.Schema;

var app = express();

//===============MONGODB===============

var dbmodel = require('./models/db');

//===============ROUTES IMPORTS===============

var r_home = require('./routes/home');
var r_signin = require('./routes/signin');
var r_newquery = require('./routes/newquery');
var r_status = require('./routes/status');
var r_metaquerygen = require('./routes/metaquerygen');
var r_adminusers = require('./routes/adminusers');
var r_profile = require('./routes/profile');

//===============MQTT===============

var mqttc = require('./mqtt/mqtt');

//===============PASSPORT===============

passport.serializeUser(function(user, done) {
	done(null, user._id);
});
 
passport.deserializeUser(function(id, done) {
	dbmodel.UserDetails.findById(id, function(err, user) {
		if(!err){
			done(err, user);
		}else{ 
			done(err,null);
		}
	});
});
//Strategy for user sign-in
passport.use('local-signin', new LocalStrategy({passReqToCallback : true}, 
	function(req, username, password, done) {
	  process.nextTick(function() {
		dbmodel.UserDetails.findOne({'username': username}, function(err, user) {
		  if (err) {
			console.log("ERROR");
			req.session.error = 'Could not log user in. Please try again.';
			return done(err);
		  }
		  //If user not found
		  if (!user) {
		  console.log("Error; %s", err);
		  console.log("COULD NOT LOG IN NOT USER %s se encontro: %s", username, user);
        req.session.error = 'Could not log user in. Please try again.';
			return done(null, false);
		  }
		  var  md5pass = crypto.createHash('md5').update(password).digest("hex"); 
		  //if pass incorrect
		  if (user.password != md5pass) {
		  console.log("COULD NOT LOG IN BAD PASSWORD:");
        req.session.error = 'Could not log user in. Please try again.';
			return done(null, false);
		  }
		  
		console.log("LOGGED IN AS: " + user.username);
        req.session.success = 'You are successfully logged in ' + user.username + '!';
		  return done(null, user);
		});
	});
}));
//Strategy for user sign-up
passport.use('local-signup', new LocalStrategy({passReqToCallback : true}, 
	function(req, username, password, done) {
	  process.nextTick(function() {
		dbmodel.UserDetails.findOne({'username': username}, function(err, user) {
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
		  //Convert pass into md5 hash
		  var  md5pass = crypto.createHash('md5').update(password).digest("hex");
		  var userdata = new dbmodel.UserDetails({
			  username: username
			, password: md5pass
			, email: req.body.email
			, firstname: req.body.firstname
			, lastname: req.body.lastname
			, admin: false
			});
		//saving new user
		userdata.save(function(err,userdetail){
			if(err){ 
				console.log("Error adding document to DB");
				return done(err);
			}
		});
		
		console.log("Añadir user ok" + username);
        req.session.success = 'You are successfully logged in ' + username + '!';
		return done(null, userdata);
		});
	});
}));

//===============EXPRESS================
// Configure Express
app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

//BD passed to request, allows accesing in routes
app.use(function(req,res,next){
    req.db = dbmodel;
    req.mqtt = mqttc.mqttclient;
    next();
});
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

app.use('/', r_home);//displays our homepage
app.use('/signin', r_signin);//displays our signup page
app.use('/newquery', r_newquery);
app.use('/status', r_status);
app.use('/metaquerygen', r_metaquerygen);
app.use('/adminusers', r_adminusers);
app.use('/profile', r_profile);


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



//===============PORT=================
var port = process.env.PORT || 5000; //select your port or let it pull from your .env file
var io = require("socket.io").listen(app.listen(port));

//===============MQTT==============================================

mqttc.mqttclient.subscribe('queryupdates');
console.log("Subscribed to queryupdates Topic!");
mqttc.mqttclient.subscribe('queryacks');
console.log("Subscribed to queryACKs Topic!");


mqttc.mqttclient.on('message', function(topic, message) {
	//===============MQTT Receive Updates=================
	if(topic == 'queryupdates'){
		var objJson = JSON.parse(message);
		console.log("!!!!!!!!!!!!!!!!!!!MQTT Udpate received for id: "+objJson._id);
		dbmodel.QueryNotifications.findById(objJson._id,'users', function(err, Qusers){
			if(err){ 
				console.log("error finding the query: "+err);
			}else{
				if(Qusers!=null){
					dbmodel.QueryNotifications.findByIdAndUpdate(objJson._id, 
						{ 
							$set: { lastresult: objJson.lastresult, lastupdated: objJson.lastupdated, changes:objJson.changes },
							$addToSet: { usersWithChanges: { $each: Qusers.users } }
						}, function (err, querydata) {
						if(!err){
							console.log("Update added to BD");
						}else{
							console.log("Error adding document to notifications DB from MQTT");
						}
					});
				}else{
					dbmodel.QueryNotifications.findByIdAndUpdate(objJson._id, 
						{ 
							$set: { lastresult: objJson.lastresult, lastupdated: objJson.lastupdated, changes:objJson.changes }
						}, function (err, querydata) {
						if(!err){
							console.log("Update added to BD.....Qusers=null");
						}else{
							console.log("Error adding document to notifications DB from MQTT");
						}
					});
				}
			}
		});
	io.send('Ack received');
	}
	//===============MQTT Receive ACKs=================
	else if(topic == 'queryacks'){
		console.log("ACK received for id: "+message);
		//io.send('Ack received');
		dbmodel.QueryNotifications.findByIdAndUpdate(message, { $set: { ack: true }}, function (err, querydata) {
			if(!err){ 
				console.log("ACK Update added to BD");
			}else{
				console.log("Error adding ACK from MQTT");
			}
		});
	}	
});




console.log("Socket.io initialized");
console.log("listening on " + port + "!");
app.set("io", io);


//===============SOCKETIO=================
io.on('connection', function(socket){
  console.log('a user connected');
	socket.on('message', function(msg){
		console.log('new message: '+msg);
		dbmodel.QueryNotifications.count({usersWithChanges: {$in:[msg]}},function(err, count){
			if(!err){ 
				if(count != 0)
					socket.send('Ack received');
			}else{
				console.log("error in query"+err);
			}
		});
	});
});