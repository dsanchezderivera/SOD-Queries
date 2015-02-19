var mongoose = require('mongoose/'),
	Schema = mongoose.Schema;

	mongoose.connect('mongodb://localhost/appdatabase');

var Schema = mongoose.Schema;
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
exports.UserDetails = mongoose.model('usercollection', UserDetail);

var Group = new Schema({
		groupName: String,
		accessLevel: Number,
		users: [{type: Schema.Types.ObjectId, ref: 'UserDetails'}]
    }, {
		collection: 'groups'
    });
exports.Groups = mongoose.model('groups', Group);

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
exports.QueryNotifications = mongoose.model('querynotifications', QueryNotification);

var QueryTemplate = new Schema({
		templateName: String,
		templateDescription: String,
		templateEndpoint: String,
		templateQuery: String,
		parameters: [{name: String, defaultparam: String}],
		metadata: [String]
    }, {
		collection: 'querytemplates'
    });
exports.QueryTemplates = mongoose.model('querytemplates', QueryTemplate);
