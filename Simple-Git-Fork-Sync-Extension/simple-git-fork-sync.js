var simpleGitForkSync = {}

simpleGitForkSync.dialogId = 'fork-sync-dialog-id';
simpleGitForkSync.selectRepoId = 'fork-sync-select-repo-id';
simpleGitForkSync.authenticationDialogId = 'fork-sync-authentication-dialog-id';
simpleGitForkSync.usernameId = 'fork-sync-username-id';
simpleGitForkSync.authenticationKeyId = 'fork-sync-authentication-key-id';
simpleGitForkSync.authenticationOkButtonId = 'fork-sync-authentication-ok-id';
simpleGitForkSync.isAuthenticated = false;

simpleGitForkSync.init = function () 
{
	// if loaded just update the repositories
	if(simpleGitForkSync.loaded)
	{
		return simpleGitForkSync.updateRepos();
	}
	
	// if not loaded make sure we don't overwrite the existing jQuery
	else if(typeof jQuery !== 'undefined')
	{
		return simpleGitForkSync.loadjQueryUI();
	}
   
   
	var jQueryScriptTag = document.createElement('script');  
	jQueryScriptTag.setAttribute('src', '//ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js');
	jQueryScriptTag.setAttribute('onload', 'simpleGitForkSync.loadjQueryUI()');
	document.getElementsByTagName('body')[0].appendChild(jQueryScriptTag);
   
}
   
simpleGitForkSync.loadjQueryUI = function () {
	
	if(jQuery.ui)
	{
		return simpleGitForkSync.loadjQueryUICss();
	}
	
	jQueryUIScriptTag = document.createElement('script');
	jQueryUIScriptTag.setAttribute('src', '//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js');
    jQueryUIScriptTag.setAttribute('onload', 'simpleGitForkSync.loadjQueryUICss()');
    document.getElementsByTagName('body')[0].appendChild(jQueryUIScriptTag);
}

simpleGitForkSync.loaded = false;

simpleGitForkSync.loadjQueryUICss = function () {    
	jQueryUICssTag = document.createElement('link');
	jQueryUICssTag.setAttribute('href', '//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/themes/smoothness/jquery-ui.css');
	jQueryUICssTag.setAttribute('rel', 'stylesheet');
    jQueryUICssTag.setAttribute('onload', 'simpleGitForkSync.updateRepos()');
    document.getElementsByTagName('body')[0].appendChild(jQueryUICssTag);
	simpleGitForkSync.cssLoaded = false;
}

simpleGitForkSync.showDialog = function (repoMap) {
    // if the dialog exist just update the dialog with the new repo map
	if(jQuery("#" + simpleGitForkSync.dialogId).length)
	{
		simpleGitForkSync.updateDropDownList(simpleGitForkSync.selectRepoId, repoMap)
		jQuery("#" + simpleGitForkSync.dialogId).dialog()
	}
	else
	{
		var dialog = simpleGitForkSync.createDialog(simpleGitForkSync.dialogId, 'Update Unmodifed Fork Masters');
		jQuery("#" + simpleGitForkSync.dialogId).dialog({
			minWidth: 520,
			buttons: [{ text: "OK",
					    click: function() { 
									simpleGitForkSync.updateRepoFromApi();
									jQuery(this).dialog("close"); 
								 },
					   },
					   {
							text: "Unauthenticate",
							click: function() {
								simpleGitForkSync.isAuthenticated = false;
							}				
						}
					 ]
		});
		
		simpleGitForkSync.createDropDownList('Select Repository: ', simpleGitForkSync.selectRepoId, repoMap)
	}
}

simpleGitForkSync.createDialog = function (id, title)
{
		var dialog = document.createElement('div');
		dialog.setAttribute('id', id)
		dialog.setAttribute('title', title)
		document.getElementsByTagName('body')[0].appendChild(dialog);
		
		return dialog;
}

simpleGitForkSync.updateRepoFromApi = function ()
{
	var selectedOption = jQuery('#' + simpleGitForkSync.selectRepoId).find(':selected');
	var base = selectedOption.data('base');
	var fork = selectedOption.data('fork');
	
	simpleGitForkSync.getLatestCommitAndPatch(base, fork);
}

simpleGitForkSync.createDropDownList = function(label, id, repoMap) {
    var label = jQuery("<label>" + label + "</label>")
    var combo = jQuery("<select></select>").attr("id", id);

    jQuery.each(Object.keys(repoMap), function (i, el) {
		jQuery.each(repoMap[el].forks, function(i2, fork) {
			combo.append("<option data-base='" + repoMap[el].base + "' data-fork='" + fork + "'>" + fork + "</option>");
		})
    });
	
	var dialog = jQuery("#" + simpleGitForkSync.dialogId)
	
	dialog.append(label);
    dialog.append(combo);
}

simpleGitForkSync.updateDropDownList = function(id, repoMap) {
    var combo = jQuery("#" + id);
	combo.empty();
	
	simpleGitForkSync.appendOptions(combo, repoMap);
    
}

simpleGitForkSync.appendOptions = function (combo, repoMap)
{
	jQuery.each(Object.keys(repoMap), function (i, el) {
			jQuery.each(repoMap[el].forks, function(i2, fork) {
				combo.append("<option data-base='" + repoMap[el].base + "' data-fork='" + fork + "'>" + fork + "</option>");
			})
		});
}

   
//Get list of repos
simpleGitForkSync.updateRepos = function () {
	simpleGitForkSync.getUserLogin(function () {
		jQuery.ajax({
		  url: 'https://api.github.com/user/repos',
		  beforeSend: function(xhr) { 
			  xhr.setRequestHeader("Authorization", "Basic " + btoa(simpleGitForkSync.username + ':' + simpleGitForkSync.authenticationKey)); 
			},
		  type: 'GET',
		  dataType: 'json',
		  contentType:'application/json',
		  cache: false,
		  success: function(repos, textStatus, jqXHR) {   
				var repoMap = {};
				repos.forEach(function(repo){ 
					
					if(repo.forks > 0)
					{
						repoMap[repo.name] || (repoMap[repo.name] = {});
						repoMap[repo.name].base = repo.full_name
					}
					else if (repo.fork)
					{
						// for now there should be only one fork, you can create multiple forks if your apart of multiple organizations
						repoMap[repo.name] || (repoMap[repo.name] = {});
						repoMap[repo.name].forks || (repoMap[repo.name].forks = []);
						repoMap[repo.name].forks.push(repo.full_name)
					}
				});
				
				Object.keys(repoMap).forEach(function(key){
					if(!repoMap[key].forks)
					{
					   delete repoMap[key];
					}
				})
				
				simpleGitForkSync.showDialog(repoMap);
				
				console.log(repoMap)
		  },
		  error: function(jqXHR, textStatus, errorThrown) { console.log(jqXHR); }
		});
	});
}

//login using authorization, and get master's latest commit hash
simpleGitForkSync.getLatestCommitAndPatch = function(base, fork)
{
	simpleGitForkSync.getUserLogin(function () {
		jQuery.ajax({
		  url: 'https://api.github.com/repos/' + base + '/git/refs/heads/master',
		  beforeSend: function(xhr) { 
			  xhr.setRequestHeader("Authorization", "Basic " + btoa(simpleGitForkSync.username + ':' + simpleGitForkSync.authenticationKey)); 
			},
		  type: 'GET',
		  contentType:'application/json',
		  cache: false,
		  success: function(data, textStatus, jqXHR) { 
				var sha = data.object.sha
				simpleGitForkSync.patchFork(fork, sha);
			},
		  error: function(jqXHR, textStatus, errorThrown) { console.log(jqXHR); }
		});
	});
}

//updates fork
simpleGitForkSync.patchFork = function (fork, sha) {
	simpleGitForkSync.getUserLogin(function () {
		jQuery.ajax({
		  url: 'https://api.github.com/repos/' + fork + '/git/refs/heads/master',
		  beforeSend: function(xhr) { 
			  xhr.setRequestHeader("Authorization", "Basic " + btoa(simpleGitForkSync.username + ':' + simpleGitForkSync.authenticationKey)); 
			},
		  type: 'PATCH',
		  data: JSON.stringify({
		  "sha": sha,
		  "force": false
		  }),
		  contentType:'application/json',
		  cache: false,
		  success: function(data, textStatus, jqXHR) { 
				console.log(data); 
				alert('success');
			},
		  error: function(jqXHR, textStatus, errorThrown) { console.log(jqXHR); }
		});
	});
}

simpleGitForkSync.createAuthenticationDialog = function(callback)
{
	var dialog = simpleGitForkSync.createDialog(simpleGitForkSync.authenticationDialogId, 'Authentication Information');
		jQuery('<label> Username: </label>').appendTo(dialog);
		jQuery('<input/>').attr({ type: 'text', id: simpleGitForkSync.usernameId}).appendTo(dialog);
		jQuery('<br><label> Password/Token: </label>').appendTo(dialog);
		jQuery('<input/>').attr({ type: 'text', id: simpleGitForkSync.authenticationKeyId}).appendTo(dialog);
		
		jQuery("#" + simpleGitForkSync.authenticationDialogId).dialog({
			minWidth: 520,
			closeOnEscape: false,
			// open: function(event, ui) {
				// /* we must hide the escape button because the jQuery event is 
				// binded so we must make sure it get invoked so its not fired twice next time*/
				// jQuery("#" + simpleGitForkSync.authenticationDialogId).closest('.ui-dialog').find('.ui-dialog-titlebar-close').hide();
			// },
			buttons: [ 
						{
							id: simpleGitForkSync.authenticationOkButtonId,
							text: 'OK',
							click: function() { 
									simpleGitForkSync.username = jQuery('#' + simpleGitForkSync.usernameId).val();
									simpleGitForkSync.authenticationKey = jQuery('#' + simpleGitForkSync.authenticationKeyId).val();
									simpleGitForkSync.isAuthenticated = true;
									callback();
									jQuery(this).dialog("close"); 
									jQuery("#" + simpleGitForkSync.authenticationDialogId).dialog('destroy').remove()
							 }
						}
					 ]
		});
}

simpleGitForkSync.getUserLogin = function (callback) 
{
	if(!simpleGitForkSync.username || !simpleGitForkSync.authenticationKey || !simpleGitForkSync.isAuthenticated)
	{
		simpleGitForkSync.createAuthenticationDialog(callback);
	}
	else	
	{
		return callback();
	}
}

console.log('loaded');

document.addEventListener('DOMContentLoaded', simpleGitForkSync.init);

//document.getElementsByTagName('body')[0].addEventListener('load', simpleGitForkSync.init);
