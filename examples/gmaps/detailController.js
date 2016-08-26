
duet.module('gmapApp').controller('detail', [], function(context) {

	context.model.selectedAddress = context.parent.model.selectedAddress;
	
	var init_map = function (coord){
		var myOptions = {zoom:10,center:new google.maps.LatLng(coord.lat,coord.lng),mapTypeId: google.maps.MapTypeId.ROADMAP};
		map = new google.maps.Map(document.getElementById('gmap_canvas'), myOptions);
		marker = new google.maps.Marker({map: map,position: new google.maps.LatLng(coord.lat,coord.lng)});
		infowindow = new google.maps.InfoWindow({content:'<strong>MAPA</strong>'});
		google.maps.event.addListener(marker, 'click', function(){
			infowindow.open(map,marker);});
		infowindow.open(map,marker);
	}

	var coord = context.model.selectedAddress.geometry.location;
	init_map(coord);
});