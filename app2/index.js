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

passport.use('local-signin', new LocalStrategy({passReqToCallback : true}, 
	function(req, username, password, done) {
	  process.nextTick(function() {
		dbmodel.UserDetails.findOne({'username': username}, function(err, user) {
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
		  
		  var userdata = new dbmodel.UserDetails({
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

mqttc.mqttclient.subscribe('queryupdates');
console.log("Subscribed to queryupdates Topic!");
mqttc.mqttclient.on('message', function(topic, message) {
  console.log("!!!!!!!!!!!!!!!!!!!MQTT Udpate received: "+message);
  var objJson = JSON.parse(message);
  dbmodel.QueryNotifications.findByIdAndUpdate(objJson._id, { $set: { lastresult: objJson.lastresult }}, function (err, querydata) {
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