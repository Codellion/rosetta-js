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