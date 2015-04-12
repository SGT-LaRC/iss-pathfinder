/*
** Home controller
*/
App.controller('home', function (page) {
	$(page).on('appShow', function () {

		var coordinates = []; //Array to hold ISS coordinates
		var flightPath = null;

		//Configure, Intialize and Load the Google Map for plotting
		var map;
		var xupdated = false;
		var yupdated = false;
		var zupdated = false;

		function initialize() {
			var mapOptions = {
				zoom: 3,
				center: new google.maps.LatLng(-41.707329939972865, -81.46817547718695)
			};
			map = new google.maps.Map(document.getElementById('simple-map-canvas'), mapOptions);
		}

		google.maps.event.addDomListener(window, 'load', initialize);

		//Lightstreamer Configuration to bring in ISS Telemetry Updates
		require(["LightstreamerClient","Subscription"],function(LightstreamerClient,Subscription) {
			var client = new LightstreamerClient("https://push.lightstreamer.com","ISSLIVE");
			client.connect();
			
			var xyzSub = new Subscription("MERGE",["USLAB000032","USLAB000033","USLAB000034"],["Value"]);
			client.subscribe(xyzSub);

			var velocitySub = new Subscription("MERGE",["USLAB000035","USLAB000036","USLAB000037"],["Value"]);
			client.subscribe(velocitySub);
			
			xyzSub.addListener({
				onItemUpdate: function(update) {
					//Adding updated item values to hidden divs at bottom of HTML
					var x = $('#USLAB000032').text();
					var y = $('#USLAB000033').text();
					var z = $('#USLAB000034').text();

					var elementId = update.getItemName();
					var value = update.getValue("Value");

					if ($("#"+elementId).text() == value) {
						return;
					}

					if("USLAB000032" == elementId) {
						x = value;
						xupdated = true;
					} else if("USLAB000033" == elementId) {
						y = value;
						yupdated = true;
					} else if("USLAB000034" == elementId) {
						z = value;
						zupdated = true;
					}

					$("#"+elementId).text(value);

					if (x.length == 0 || z.length == 0 || z.length == 0) {
						return;
					}

					if (xupdated && yupdated) {
						var lla = ecef2lla(x,y,z);

						position = new google.maps.LatLng(lla[0], lla[1]);

						map.setCenter(position)
						coordinates.push(position);

						if(null != flightPath) removePolyline();

						addPolyline(map,coordinates);
						
						xupdated = yupdated = zupdated = false;
					}
				}
			});
		});

		//http://stackoverflow.com/questions/18253546/ecef-to-lla-lat-lon-alt-in-java
		// WGS84 ellipsoid constants
		var a = 6378137; // radius
		var e = 8.1819190842622e-2;  // eccentricity
		var asq = Math.pow(a,2);
		var esq = Math.pow(e,2);

		function ecef2lla(x, y, z){
			x*=1000;
			y*=1000;
			z*=1000;
			var b = Math.sqrt( asq * (1-esq) );
			var bsq = Math.pow(b,2);
			var ep = Math.sqrt( (asq - bsq)/bsq);
			var p = Math.sqrt( Math.pow(x,2) + Math.pow(y,2) );
			var th = Math.atan2(a*z, b*p);
			var lon = Math.atan2(y,x);
			var lat = Math.atan2( (z + Math.pow(ep,2)*b*Math.pow(Math.sin(th),3) ), (p - esq*a*Math.pow(Math.cos(th),3)) );
			var N = a/( Math.sqrt(1-esq*Math.pow(Math.sin(lat),2)) );
			var alt = p / Math.cos(lat) - N;

			// mod lat to 0-2pi
			lon = lon % (2*Math.PI);
			lat = lat * 180 / Math.PI;
			lon = lon * 180 / Math.PI;
			lon = ((lon-getGMST())%360);
			if (lon < -180 ) lon +=360;
			if (lon > 180 ) lon -=360;

			return [lat, lon, alt];
		}

		/* Modified from http://www.abecedarical.com/javascript/script_clock.html
		*  returns: GMST time in degrees
		*/
		function getGMST()
		{
			var now = new Date(); 
		    var year   = now.getUTCFullYear();
		    var month  = now.getUTCMonth() + 1;
		    var day    = now.getUTCDate();
		    var hour   = now.getUTCHours();
		    var minute = now.getUTCMinutes();
		    var second = now.getUTCSeconds();
		    if( month == 1 || month == 2 ) {
				year = year - 1;
				month = month + 12;
		    }
		    var a = Math.floor( year/100 );
		    var b = 2 - a + Math.floor( a/4 );
		    var c = Math.floor(365.25 * year);
		    var d = Math.floor(30.6001 * (month + 1));
		    // days since J2000.0   
		    var jd = b + c + d - 730550.5 + day + (hour + minute/60.0 + second/3600.0)/24.0;
		    var jt   = jd/36525.0; // julian centuries since J2000.0         
		    var GMST = 280.46061837 + 360.98564736629*jd + 0.000387933*jt*jt - jt*jt*jt/38710000;           
		    if( GMST > 0.0 ) {
		        while( GMST > 360.0 )
		            GMST -= 360.0;
		    } else {
		        while( GMST < 0.0 )
		            GMST += 360.0;
		    }   
		    return GMST;
		}

		function addPolyline(map,coordinates) {
			var flightPath = new google.maps.Polyline({
				path: coordinates,
				geodesic: true,
				strokeColor: '#FF0000',
				strokeOpacity: 1.0,
				strokeWeight: 2
			});

			flightPath.setMap(map);
		}

		function removePolyline() {
			flightPath.setMap(null);
		}

		
	});
});

/*
** Page2 controller
*/
App.controller('page2', function (page) {
	$(page).on('appReady', function () {

		if(!Detector.webgl){
      		Detector.addGetWebGLMessage();
    	} else {

			// Where to put the globe?
			var container = document.getElementById( 'threejs-container' );

			// Make the globe
			var globe = new DAT.Globe( container );
			globe.animate();
		}
	});	
});




/*
** Page3 controller
*/
App.controller('page3', function (page) {
	$(page).on('appReady', function () {
		require.config({paths: {d3: "js/d3.v3.min"}});

		require(["d3"], function(d3) {
		  	var sampleSVG = d3.select("#d3js-container")
		        .append("svg")
		        .attr("width", 100)
		        .attr("height", 100);    

		    sampleSVG.append("circle")
		        .style("stroke", "gray")
		        .style("fill", "white")
		        .attr("r", 40)
		        .attr("cx", 50)
		        .attr("cy", 50)
		        .on("mouseover", function(){d3.select(this).style("fill", "aliceblue");})
		        .on("mouseout", function(){d3.select(this).style("fill", "white");})
		        .on("mousedown", animateFirstStep);

			function animateFirstStep(){
			    d3.select(this)
			      .transition()            
			        .delay(0)            
			        .duration(1000)
			        .attr("r", 10)
			        .each("end", animateSecondStep);
			};

			function animateSecondStep(){
			    d3.select(this)
			      .transition()
			        .duration(1000)
			        .attr("r", 40);
			};
		});
	});
});

try {
  App.restore({ maxAge: 5*60*1000 });
} catch (err) {
  App.load('home');
}
