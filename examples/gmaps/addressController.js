

duet.module("gmapApp").controller('address', ["http", "rootContext"], function(context, http, rootContext) {
	context.model.result = "Pendiente";
	context.model.results = [];
	context.model.address = "San Francisco";
	context.model.selectedAddress = null;

	context.model.loadGoogleAddress = function(firstLoad) {
		context.model.selectedAddress = null;

		if(context.model.address && context.model.address != "") {
			rootContext.loading = "block";

			context.model.result = "En progreso";

			http.get("http://maps.googleapis.com/maps/api/geocode/json?address=" + context.model.address, function(e) {
				context.model.results = e.data.results;
		    	context.model.result = e.data.status;

				rootContext.loading = "none";

				//Al ser una carga asincrona de datos puede ser que no se haya cargado la vista parcial que la utilizan
				//Forzamos a volver a recargar el modelo
				if(firstLoad)
					context.binding();
			});
		}
		else {
			context.model.result = "Pendiente";
			context.model.results = [];
		}
	};

	context.model.selectAddress = function(selAdd) {
		context.model.selectedAddress = selAdd;
	}

	//EVENTOS DEL MODELO
	context.watch("address", function(e){
    	context.model.loadGoogleAddress();
	});

	//Estados del controlador y carga de vistas parciales
	context.list = function() {
		context.model.loadGoogleAddress(true);
		return {
			"content" : {
				template: "template.html",
				controller: ""
			}
		}
	};
});

duet.module("gmapApp").controller('subController', [], function(context) {
	context.model.result = context.parent.model.result;

	context.parent.model._result.subscribe(function(binding){
		context.model.result = binding.value;
	});
});