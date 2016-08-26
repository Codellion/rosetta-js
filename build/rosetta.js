(function(duet) {

	//CLASES INTERNAS

	function RosettaApp(name) {
		this.name = name;
		this.components = {};
		this.cacheComponents = {};
		this.externalApps = [];
		this.imports = {};
		this.rootContext = {};
		this.onInit = [];
		this.onLoad = [];
		this.controllers = {};
		this.cacheControllers = {};
	}	

	//EXTENSIÓN DEL MODELO DUET-JS

	duet.extend({
		modules: {},
		cacheModules: {},
		extension: { rosetta: {} },
		rosettaApp: null
	});

	//METODOS AMPLIACION DUET-JS

	duet.fn.injectDep = function(func, dep, app, loadedModules) {
		var depInstances = [];

		if(dep)
		{
			var loadedExtModules = {};

			for(var i in dep) {
				if(duet.modules[dep[i]]){
					var mod;

					if(loadedModules && loadedModules[dep[i]])
						mod = loadedModules[dep[i]];
					else
						mod = duet.module(dep[i]);

					depInstances.push(mod);

					if(mod instanceof RosettaApp) {
						loadedExtModules[dep[i]] = mod;
					}
				}
				else if(app && app.imports[dep[i]]) {
					var modName = app.imports[dep[i]];
					var mod = loadedExtModules[modName];
					
					if(!mod)
						mod = duet.module(modName);
					
					depInstances.push(mod.component(dep[i]));
				}
			}
		}

		depInstances.unshift(func);

		var res = func.apply(func, depInstances);

		if(typeof(res) == "undefined")
			return func;
		else
			return res;
	}

	duet.fn.module = function(name, dep, module, cacheable, loadedModules) {
		if(module) {
			duet.modules[name] = function() {
				return duet.injectDep(module, dep, null, loadedModules);
			};
		}

		if(cacheable){
			duet.cacheModules[name] = duet.modules[name]();
		}

		if(duet.cacheModules[name])
			return duet.cacheModules[name];
		else
			return duet.modules[name]();
	};

	duet.fn.getRosettaApp = function() {
		if(duet.cacheModules[duet.rosettaApp])
			return duet.cacheModules[duet.rosettaApp];
	}

	//MODULOS BASE

	duet.module("rootContext", null, function(context){
		var app = duet.getRosettaApp();

		if(app)
			return app.rootContext;
	});	

	//MODULO APP ROSETTA MVC

	duet.fn.rosetta = function(name, dep) {
		var app = new RosettaApp(name);
		var depInstances = {};

		for(var i in dep) {
			if(duet.modules[dep[i]]){
				var mod = duet.module(dep[i]);
				depInstances[dep[i]] = mod;

				if(app && mod instanceof RosettaApp) {
					app.externalApps.push(dep[i]);

					for(var j in mod.components) {
						app.imports[j] = dep[i];
					}
				}
			}
		}

		return duet.module(name, dep, function() {
			return app;
		}, true, depInstances);
	};


	//Fase de configuración
	RosettaApp.prototype.init = function(dep, init) {
		var initEvent = function() {
			if(init)
				duet.injectDep(init, dep);
		}

		this.onInit.push(initEvent);
	};

	//Fase de carga
	RosettaApp.prototype.load = function(dep, load) {
		var loadEvent = function() {
			if(load)
				duet.injectDep(load, dep);
		}

		this.onLoad.push(loadEvent);
	};

	//Registro de componentes
	RosettaApp.prototype.component = function(name, dep, expr, cacheable, loadedModules) {

		var app = this;

		if(expr) {
			app.components[name] = function() {
				return duet.injectDep(expr, dep, app, loadedModules);
			};
		}

		if(cacheable){
			app.cacheComponents[name] = app.components[name]();
		}

		if(app.cacheComponents[name])
			return app.cacheComponents[name];
		else
			return app.components[name]();

	};

	//Métodos de controladores
	var _binding = function(ctrlName, ctrl) {
		duet.bind(ctrl.model, ctrlName);
	}

	var _initWatch = function(prop, callback, ctrl) {
		ctrl.model["_" + prop].subscribe(function(e){
			callback(e);
		})
	}

	//Registro de controladores
	RosettaApp.prototype.controller = function(name, dep, controller, loadedModules) {

		var app = this;

		if(controller) {
			app.controllers[name] = function(parent) {
				controller.model = {};
				controller.parent = parent;
				controller.watchers = [];

				controller.binding = function() {
					_binding(name, controller);
				}

				controller.watch = function(prop, callback) {
					controller.watchers.push({prop: prop, callback: callback});
				}

				return duet.injectDep(controller, dep, app, loadedModules);
			};
		}
	};

	//Bootstrap de Rosetta
	RosettaApp.prototype.bootstrap = function() {
		duet.preInit(function(context) {

			//Determinar el rosetta dominante en la pagina

			var rosetaAppName = document.body.attributes["rosetta"].value;

			duet.rosettaApp = rosetaAppName;
			duet.model = app.rootContext;

			//Ejecutar todos los init's de las RosettaApps cargadas en la pagina
			
			for(var i in app.externalApps){
				var initEvents = duet.module(app.externalApps[i]).onInit;

				for(var j in initEvents)
					initEvents[j]();
			}

			for(var k in app.onInit)
				app.onInit[k]();

			//Ejecutar todos los load's de las RosettaApps cargadas en la pagina
			
			for(var i in app.externalApps){
				var loadEvents = duet.module(app.externalApps[i]).onLoad;

				for(var j in loadEvents)
					loadEvents[j]();
			}

			for(var k in app.onLoad)
				app.onLoad[k]();

		 	//Se enlaza el rootContext con bind.model([rosettaApp.rootContext]

			duet.bind(app.rootContext);

			//Determinar los dt-controllers enlazados en la vista actual, ejecutarlos e id enlazandolos con bind.model([controller], [name_controller])

			var pageCtrls = duet.extension.rosetta.getControllers();
			app.cacheControllers = {};
			duet.extension.rosetta.configControllers(pageCtrls, app.cacheControllers);
		});

		duet.init();
	}

	//METODOS PRIVADOS DE ROSETTA

	duet.extension.rosetta.getControllers = function(element) {
		if(!element)
			element = document;

		var dom =  element.getElementsByTagName('*');
		var res = [];
		var resParent = [];

		for(var i=0; i<dom.length; i++){
			var domObj = dom[i];

			if(domObj.attributes.hasOwnProperty("controller") || domObj.attributes.hasOwnProperty("data-controller")){
				var ctrlName;

				if(domObj.attributes.hasOwnProperty("controller")) {
					ctrlName = domObj.attributes["controller"].value;
				}
				else if(domObj.attributes.hasOwnProperty("data-controller")) {
					ctrlName = domObj.attributes["data-controller"].value;
				}

				
				var parentController;
				var isSubElement = false;

				for(var k=0; k<resParent.length && !isSubElement; k++){
					isSubElement = resParent[k].element.contains(domObj);

					if(isSubElement)
						parentController = resParent[k].name;
				}

				if(!isSubElement){
					resParent.push({ 
						element: domObj,
						name: ctrlName
					});
				}

				res.push({ 
					name: ctrlName,
					container: domObj,
					parent: parentController
				});
			}
		}

		return res.reverse();
	}

	duet.extension.rosetta.bindCtrlChildNodes = function(element, ctrlName) {
		if(!element)
			element = document;

		var tempModelView = new ModelView();
		tempModelView.originalModel.modelName = "duet.model";

		var htmlComps = tempModelView.getAllDuetNodes(element);

		for(var i in htmlComps) {
			htmlComps[i].setAttribute("dt", ctrlName);
		}
	}

	duet.extension.rosetta.configController = function(pageCtrls, ctrlName, instanceCtrl, pageCtrl) {
		if(!instanceCtrl[ctrlName])
		{
			if(!pageCtrl){
				for(var i=0; i<pageCtrls.length && !pageCtrl; i++) {
					if(pageCtrls[i].name == ctrlName)
						pageCtrl = pageCtrls[i];
				}
			}

			if(pageCtrl) {
				var parent;

				//Se añade el ambito del padre en caso estar encapsulado dentro de otro controlador
				if(pageCtrl.parent) {
					if(!instanceCtrl[pageCtrl.parent])
						duet.extension.rosetta.configController(pageCtrls, pageCtrl.parent, instanceCtrl);

					parent = instanceCtrl[pageCtrl.parent];
				}

				var ctrlContext = app.controllers[ctrlName](parent);	
				instanceCtrl[ctrlName] = ctrlContext;

				window[ctrlName] = ctrlContext.model;

				//Enlace del controlador
				duet.bind(ctrlContext.model, ctrlName, true);

				for(var i=0; i< ctrlContext.watchers.length; i++){
					var watch = ctrlContext.watchers[i];
					_initWatch(watch.prop, watch.callback, ctrlContext);
				}
			}
		}
		else {
			instanceCtrl[ctrlName].binding();
		}
	}

	duet.extension.rosetta.configControllers = function(pageCtrls, instanceCtrl) {
		for(var i in pageCtrls) {
			var pageCtrl = pageCtrls[i];

			//Establecer los elementos HTML enlazados al controlador
			duet.extension.rosetta.bindCtrlChildNodes(pageCtrl.container, pageCtrl.name);
		}

		for(var i in pageCtrls) {
			duet.extension.rosetta.configController(pageCtrls, pageCtrls[i].name, instanceCtrl, pageCtrls[i]);
		}
	}


})(duet);
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
}, true);

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