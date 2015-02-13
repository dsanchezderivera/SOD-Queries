$(function(){

  var xmlhttp_results=new XMLHttpRequest();
  xmlhttp_results.onreadystatechange=function(){
    if (xmlhttp_results.readyState==4 && xmlhttp_results.status==200){
      var e = $("#search_results");
      e.html("");
      var jsonresults = jQuery.parseJSON(xmlhttp_results.responseText);
      e.html(function() {
        if (jsonresults.length == 0)
        {
          e.append('<li style="padding-top: 3px; padding-bottom: 3px"><a style="color: #999; word-wrap: break-word; white-space: normal" href="#">No results found</a></li>');
        }
        else
        {
          $.each(jsonresults, function(t, n) {
            e.append('<li style="padding-top: 3px; padding-bottom: 3px"><a style="color: #999; word-wrap: break-word; white-space: normal" class="template_link" id=' + n._id + '>' + n.templateName + '</a></li>');
          });
        }
      });
        //alert(xmlhttp_results.responseText);
        //document.getElementById("myDiv").innerHTML=xmlhttp_results.responseText;
      }
    }


    $('#search_button').on('click', function(e){
      var e = $("#search_template_bar").val().toLowerCase();
      xmlhttp_results.open("GET","/metaquerygen/search?hint="+e, true);
      xmlhttp_results.send();
    });

    var xmlhttp_user_results=new XMLHttpRequest();

    xmlhttp_user_results.onreadystatechange=function(){
      if (xmlhttp_user_results.readyState==4 && xmlhttp_user_results.status==200){
       var e = $("#searched_users");
       e.html("");
       var jsonresults = jQuery.parseJSON(xmlhttp_user_results.responseText);
  			 //alert(JSON.stringify(jsonresults));

        e.html(function() {
          if (jsonresults.length == 0)
          {
            e.append('<li style="padding-top: 3px; padding-bottom: 3px"><a style="color: #999; word-wrap: break-word; white-space: normal" href="#">No results found</a></li>');
          }
          else
          {
            $.each(jsonresults, function(t, n) {
              e.append('<li style="padding-top: 3px; padding-bottom: 3px" id="'+n.username+'">'+n.username+' <button type="button" class="btn btn-default user_link" id=' + n._id + '>Add User</button></li>');
            });
          }
        });
  			//alert(xmlhttp_user_results.responseText);
    		//document.getElementById("myDiv").innerHTML=xmlhttp_user_results.responseText;
    	}
    }


    $('#search_users_button').on('click', function(e){
      var e = $("#search_users_text").val().toLowerCase();
      xmlhttp_user_results.open("GET","/adminusers/search?hint="+e, true);
      xmlhttp_user_results.send();
    });


    var xmlhttp_template=new XMLHttpRequest();
    xmlhttp_template.onreadystatechange=function(){
      if (xmlhttp_template.readyState==4 && xmlhttp_template.status==200){
        var jsonresults = jQuery.parseJSON(xmlhttp_template.responseText);
        $("#idfield").val(jsonresults._id);
        $("#namefield").val(jsonresults.templateName);
        $("#descfield").val(jsonresults.templateDescription);
        $("#endpointfield").val(jsonresults.templateEndpoint);
        $("#queryfield").val(jsonresults.templateQuery);
      }
    }

    $('.results_container').on('click','.template_link', function(e){
      xmlhttp_template.open("GET","/metaquerygen/template?id="+e.target.id, true);
      xmlhttp_template.send();
    });


    $('.results_container').on('click','.user_link', function(e){
      $('#added_users').append('<li style="padding-top: 3px; padding-bottom: 3px">' + e.target.parentNode.id + '</li>')
    });
  });
