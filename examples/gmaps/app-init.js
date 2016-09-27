
var app = duet.rosetta('gmapApp', []);

app.init(["rootContext", "router"], function(context, rootContext, router) {
	rootContext.title = "rosettaJS PoC";
	rootContext.loading = "none";

	//Tabla de enrutamiento de la aplicación
	router.otherWise("address/list")	
	.registerRoute({
		name: "addressDetail",
		url: "address/detail",
		views: {
			"content" : {
				template: "detail.html",
				controller: "detail"
			},
			"content.subContent1" : {
				template: "subDetail1.html",
				controller: "detail"
			},
			"content.subContent2" : {
				template: "subDetail2.html",
				controller: "detail"
			}
		}
	});

	router.init();
});

app.bootstrap();










