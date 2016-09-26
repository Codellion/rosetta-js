app.component('flickr', ['http'], function(context, http) {

	context.photos = [];

	context.getPhotos = function(callback) {
		http.jsonp('https://api.flickr.com/services/feeds/photos_public.gne?format=json', function(data) {
			if(data) {
				context.photos = data.items;
			}

			if(callback)
				callback();
			
		}, 'jsonFlickrFeed');
	};

}, true);