
duet.module("router", ["http"], function(context, http) {
	var loadedScripts = [];
	var inlineScripts = [];
	var viewCount = 0;
	var viewTotal = 0;
	var scriptsCount = 0;
	var scriptsTotal = 0;
	var pendingViews = {};
	var loadedViews = [];

	context.view = {};
	context.params = {};
	context.otherwise = null;
	context.engineroute = {
		"default": {
			name: "default",
			url: ":controller/:action/:id?",
			views: function() {
				var app = duet.getRosettaApp();

				var ctrlName = context.params["controller"];
				var action = context.params["action"];

				var ctrl = app.cacheControllers[ctrlName];

				if(!ctrl)
					ctrl = app.controllers[ctrlName]();

				return ctrl[action]();
			}
		}
	};

	context.registerRoute = function(route) {
		context.engineroute[route.name] = route;
		return context;
	};

	context.otherWise = function(url) {
		context.otherwise = url;
		return context;
	};

	context.loadPartialView = function(viewname, template) {
		http.get(template, function(e){

			var actualComponent = document.querySelector('[partialView="' + viewname + '"]');
			actualComponent.innerHTML = e.data;

			var pageCtrls = duet.extension.rosetta.getControllers(actualComponent);
			var app = duet.getRosettaApp();

			//Se limpian los controladores que se van cargar de nuevo con la vista
			for(var k=0; k<pageCtrls.length; k++) {
				app.cacheControllers[pageCtrls[k].name] = undefined;
			}

			context.loadScripts(actualComponent, viewname);
		});
	};

	context.loadScripts = function(htmlComponent, viewname) {
		var scripts = htmlComponent.querySelectorAll('script');
		var fileScripts = [];

		scriptsCount = 0;
		inlineScripts = [];

		for(var i=0; i<scripts.length; i++) {
			var innerScript = scripts[i];

			if(innerScript.src && loadedScripts.indexOf(innerScript.src) == -1){
				scriptsTotal++;

				loadedScripts.push(innerScript.src);
				fileScripts.push(innerScript.src);
			} 
			else {
				inlineScripts.push(innerScript.innerText);
			}
		}

		scriptsTotal = fileScripts.length;

		if(scriptsTotal > 0){
			for(var i=0; i<fileScripts.length; i++) {
				var ele = document.createElement("script");

				ele.onload = function() {
					viewLoadComplete(viewname, htmlComponent);
				};

				ele.src = fileScripts[i];

				htmlComponent.appendChild(ele);
			}
		}
		else {
			viewLoadComplete(viewname, htmlComponent);
		}
	};

	context.init = function() {
		eventRoute({ newURL: location.href });
	}

	//METODOS PRIVADOS

	var viewLoadComplete = function(viewname, htmlComponent) {
		scriptsCount++;

		if(scriptsCount >= scriptsTotal) {
			for(var i=0; i<inlineScripts.length; i++)
				eval(inlineScripts[i]);

			//TODO EVENTO DE CARGAR PARCIAL Y FALTA UNO PARA TOTAL
			//var event = new CustomEvent('duetPartialViewLoaded_' + actualTemplate, { 'detail': actualComponent });
			//document.dispatchEvent(event);

			loadedScripts.push(viewname);

			viewCount++;

			if(viewCount >= viewTotal) {
				var hasPendingViews = false;

				for(var pView in pendingViews) {
					hasPendingViews = true;
					break;
				}

				//Comprobamos si quedan subvistas por enlazar
				if(hasPendingViews) {
					loadViews(pendingViews);
				}
				else {
					//Determinar los dt-controllers enlazados en la vista actual, ejecutarlos e id enlazandolos con bind.model([controller], [name_controller])
					var pageCtrls = duet.extension.rosetta.getControllers();
					var app = duet.getRosettaApp();
					
					var ctrlList = [];

					for(var k=0; k<pageCtrls.length; k++) {
						ctrlList.push(pageCtrls[k].name);
					}

					//Descargo aquellos controladores que no van a ser usados en esta vista
					for(var subModel in duet.subModelViews){
						if(ctrlList.indexOf(subModel) == -1) {
							duet.subModelViews[subModel].unbind();
							duet.subModels[subModel] = undefined;
							duet.subModelViews[subModel] = undefined;
						}
					}

					duet.extension.rosetta.configControllers(pageCtrls, app.cacheControllers);
				}
			}
		}
	};

	var redirect = function(e) {
		//comprobar que no estamos en la dirección del otherwise
		var prefix =  e.newURL.slice(0, e.newURL.indexOf('#') + 1);
		if(prefix == "")
			prefix = e.newURL + '#';

		var redirectUrl = prefix + context.otherwise;
		if(window.location.href != redirectUrl)
			window.location.assign(redirectUrl);
	}

	var loadViews = function(views) {
		viewCount = 0;
		viewTotal = 0;
		pendingViews = {};

		var viewsToLoad = [];

		for(var view in views){
			var viewParts = view.split('.');
			var originalViewName;

			if(views[view].originalPartialName)
				originalViewName = views[view].originalPartialName;
			else
				originalViewName = view;

			if(viewParts.length > 1 && loadedViews.indexOf(viewParts[0]) == -1){
				if(!views[view].originalPartialName)
					views[view].originalPartialName = view;
				pendingViews[viewParts.slice(1).join('.')] = views[view];
			}
			else
				viewsToLoad.push({name: view, oriName: originalViewName});
		}

		viewTotal = viewsToLoad.length;

		for(var i=0; i<viewsToLoad.length; i++) {
			var viewname = viewsToLoad[i].name;
			var oriViewname = viewsToLoad[i].oriName;
			var template, view = views[viewname];

			if(typeof view.template == "string")
				template = view.template;
			else
				template = view.template(context);

			context.loadPartialView(oriViewname, template);
		}
	}

	var eventRoute = function(e){
		context.view = {};
		context.params = {};

		if(e.preventDefault)
			e.preventDefault();

		if(e.newURL.indexOf('#') != -1) {
			var route = e.newURL.slice(e.newURL.indexOf('#') + 1).split('/');

			var paramsUrl;
			var state;

			//Determinar la ruta valida
			for(var stateName in context.engineroute) {
				var auxParamsUrl = [];

				var auxState = context.engineroute[stateName];
				var urlPattern = auxState.url.split('/');
				var valid = route.length <= urlPattern.length;

				for(var iPattern in urlPattern) {
					var paramPatter = urlPattern[iPattern];

					if(paramPatter.indexOf(':') == 0) {							
						//Comprobación de parametros opcionales
						if(paramPatter.indexOf('?') == paramPatter.length -1) {
							auxParamsUrl.push(paramPatter.slice(1, paramPatter.length -1));
						}
						else {
							auxParamsUrl.push(paramPatter.slice(1));
							valid = valid && route.length > iPattern;
						}
					}
					else {
						auxParamsUrl.push(null);
						valid = valid && route.length > iPattern && paramPatter == route[iPattern];
					}

					if(!valid)
						break;
				}

				if(valid){
					paramsUrl = auxParamsUrl;
					state = auxState; 
				}
			}

			//redirects
			if(!state) {
				redirect(e);
			}
			else {
				if(route.length > 0){
					var i = 0;

					while(route.length > i && route[i] && route[i] != null) {
						if(paramsUrl.length > i && paramsUrl[i] != null)
							context.params[paramsUrl[i]] = route[i];

						i++;
					}
				}

				var views;

				//views como object
				if(typeof(state.views) == "object") {
					views = state.views;
				}
				//views como function
				else {
					views = state.views(context);
				}				

				loadedViews = [];

				//Carga de vistas parciales
				loadViews(views);
			}
		}
		else {
			redirect(e);
		}
	};

	//Inicializacion
	window.addEventListener('hashchange', eventRoute, false);

}, true);