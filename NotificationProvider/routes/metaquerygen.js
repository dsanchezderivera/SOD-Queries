var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res){
	res.render('metaquerygenerator', {user: req.user});
});

router.post('/', function(req, res){
	var newTemplate = new req.db.QueryTemplates({
		templateName: req.body.form_name,
		templateDescription: req.body.form_description,
		templateEndpoint: req.body.form_endpoint,
		templateQuery: req.body.form_query,
		parameters: [{name: '$1', defaultparam: req.body.form_param1}],
		metadata: [req.body.form_metadata1]
	});
	console.log('New Template: '+newTemplate);
	if(req.body.form_id == '' || !req.body.form_id){
		newTemplate.save(function(err,data){
			if(err){ 
				console.log("Error adding template: "+err);
				req.session.error = 'Error adding template: '+err;
				res.redirect('/metaquerygen');
			}else{
				console.log("Template added to DB");
				req.session.success = 'Template added!';
				res.redirect('/metaquerygen');
			}
		});
	}
	else{
		delete newTemplate._id;
		req.db.QueryTemplates.findByIdAndUpdate(req.body.form_id, newTemplate, function(err, data){
			if(err){
				console.log("Error updating template: "+err);
				req.session.error = 'Error updating template: '+err;
				res.redirect('/metaquerygen');
			}else{
				console.log("Template updated on DB");
				req.session.success = 'Template updated!';
				res.redirect('/metaquerygen');
			}	
		});
	}
});

router.get('/search', function(req, res) {
		req.db.QueryTemplates.find({"templateName": new RegExp(req.param('hint'), "i")}, 'templateName',function(err,names){
			res.send(names);
		});
});

router.get('/template', function(req, res) {
		req.db.QueryTemplates.findOne({"_id": req.param("id")},function(err,template){
			res.send(template);
		});
});

module.exports = router;