duet.module("http", null, function(context){
	var ajaxCall = function(verb, url, onSuccess, onError) {
		var xhr = new XMLHttpRequest();
		xhr.open(verb, url);
		xhr.send(null);

		xhr.onreadystatechange = function () {
		 	var DONE = 4; // readyState 4 means the request is done.
		  	var OK = 200; // status 200 is a successful return.

			if (xhr.readyState === DONE) {
			    if (xhr.status === OK) {
			  		if(onSuccess) {
			  			var data;

			  			try {
							data = JSON.parse(xhr.responseText);
			  			}
			  			catch(e) {
			  				data = xhr.response;
			  			}

			  			onSuccess({ data: data, XMLHttpRequest: xhr });
			  		}
			    } else {
			      	console.log('Error: ' + xhr.status); // An error occurred during the request.
			    	if(onError)
			      		onError(xhr);
			    }
			}
		};
	}

	context.get = function(url, onSuccess, onError) {
		ajaxCall("GET", url, onSuccess, onError);
	};

	context.jsonp = function(url, callback, jsonpCallback) {
	    var callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

	    if(jsonpCallback)
	    	callbackName = jsonpCallback;
	    
	    window[callbackName] = function(data) {
	        delete window[callbackName];
	        document.body.removeChild(script);
	        callback(data);
	    };

	    var script = document.createElement('script');
	    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
	    document.body.appendChild(script);
	};

}, true);