
duet.module('flickr', ['http'], function(context, http) {

	context.photos = [];

	context.getPhotos = function() {
		http.jsonp('https://api.flickr.com/services/feeds/photos_public.gne?format=json', function(data) {
			if(data) {
				context.photos = data.items;
			}
		}, 'jsonFlickrFeed');
	};

}, true);

var app = duet.rosetta('componentExample', ['flickr']);

app.tag('photoflickr', null, function(context) {
	return {
		data: {
			author: '',
			description: '',
			link: '',
			image: '',
			tags: [],
			title: ''
		},
		states: {
			class: ''
		},
		actions: ["render", "changeHover", "changeHoverOut", "flipDetail"],
		behaviors: {
			"shared" : {
				changeHover: function() {
					this.states.class = "bolder";
				},
				changeHoverOut: function() {
					this.states.class = "";
				}
			},
			"default" : {
				init: function() {
					if(this.dataset.title)
						this.data.title = this.dataset.title;
				},
				flipDetail: function() {
					this.data.title = "PERFECT";
					this.data.description = "dessss";
					this.state("detail");
				},
				render: function() {
					return 	"<div dt-onmouseenter='@this.actions.changeHover()' dt-onmouseleave='@this.actions.changeHoverOut()' dt-onclick='@this.actions.flipDetail()'>"
						+ 		"<span dt-class-Name='#this.states.class' dt-innerHTML='#this.data.title'></span>"
						+ 	"</div>";
				}
			},
			"detail" : {
				flipDetail: function() {
					this.state("default");
				},
				render: function() {
					return 	"<div dt-onmouseenter='@this.actions.changeHover()' dt-onmouseleave='@this.actions.changeHoverOut()' dt-onclick='@this.actions.flipDetail()'>"
						+ 		"<span dt-class-Name='#this.states.class' dt-innerHTML='#this.data.description'></span>"
						+ 	"</div>";
				}
			},
		}
	};
});

app.init(['flickr'], function(context, flickr){
	flickr.getPhotos();
});

app.controller('compCtrl', null, function(context) {
	context.model.title = "HOLA MUNDO!!";

	context.model.changeText = function() {
		context.model.title = "oooooook";
	}
});

app.bootstrap();



function test() {
	/*
	app.components.photoFlickr();
	var newComp = document.createElement('x-photoFlickr');
	newComp.data.title = "HOLA MUNDO!!!";	
	newComp.data.description = "Esta prueba ha funcionado correctamente!!!";	
	document.querySelector('#comp').appendChild(newComp)
	newComp.init();
	*/

}