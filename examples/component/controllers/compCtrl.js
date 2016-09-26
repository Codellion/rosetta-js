app.controller('compCtrl', ['flickr'], function(context, flickr) {
	context.model.photos = [];

	context.model.refreshPhotos = function() {
		flickr.getPhotos(function() {
			context.model.photos = flickr.photos;
		});
	}

	context.model.refreshPhotos();
});