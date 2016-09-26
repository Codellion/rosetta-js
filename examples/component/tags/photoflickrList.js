app.tag('photoflickrList', null, function(context) {
	return {
		data: {
			photos: []
		},
		states: {
		},
		actions: ["render"],
		behaviors: {
			"default" : {
				render: function() {
					return	'<div style="width: 100%; margin-top:20px;" dt-children="#this.data.photos">'
						+	'	<dt-photoflickr dt-data.title="title" dt-data.image="#this.media.m" dt-data.description="description"></x-photoflickr>'
						+ 	'</div>'
				}
			}
		}
	};
});