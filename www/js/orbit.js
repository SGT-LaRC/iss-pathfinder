var track = orbit.orbitData;
var crossHair1;
var crossHair2;
var map1;
var map2;
var timeDiff = 0;
var lastDayNightOverlayUpdate = 0;
var isMiles = false;
var MILE_IN_KM = 1.609344;

var dict = {
  decimalPoint: ".",
  south: "South",
  east: "East",
  north: "North",
  west: "West",
  snapshotURL: "http://iss.astroviewer.net/basicmap.php"
};


function initializeMaps() {
  var serverTime = orbit.tRef;
  var clientTime = Math.round(new Date().getTime()/1000);
  timeDiff = clientTime - serverTime;

  var currTime = serverTime;

  var state = getSatelliteState(currTime);
  var time   = state.time;
  var satLon = state.lon;
  var satLat = state.lat;

  var groundPointLatLng = new google.maps.LatLng(satLat, satLon);
  var myOptions = {
    zoom: 6,
    center: groundPointLatLng,
    disableDefaultUI: true,
    disableDoubleClickZoom: true,
    draggable: false,
    scrollwheel: false,
    scaleControl: true,
    mapTypeId: google.maps.MapTypeId.HYBRID
  };
  map1 = new google.maps.Map(document.getElementById("map_canvas1"), myOptions);


  var equatorLatLng = new google.maps.LatLng(0.0, satLon);
  var myOptions = {
    zoom: 1,
    center: equatorLatLng,
    disableDefaultUI: true,
    disableDoubleClickZoom: true,
    draggable: false,
    scrollwheel: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  map2 = new google.maps.Map(document.getElementById("map_canvas2"), myOptions);
  
  initializeDayNightOverlay(map2, currTime*1000);
  lastDayNightOverlayUpdate = currTime;

  var image = new google.maps.MarkerImage("img/iss.png",
      new google.maps.Size(21, 21),     // size
      new google.maps.Point(0, 0),      // origin
      new google.maps.Point(10, 10));   // anchor
  crossHair1 = new google.maps.Marker({
    position: groundPointLatLng,
    map: map1,
    icon: image
  });
  crossHair2 = new google.maps.Marker({
    position: groundPointLatLng,
    map: map2,
    icon: image
  });


  var miSel = document.getElementById("milesSelector");
  if (miSel) {
    miSel.checked = true;
    isMiles = true;
  }

  addOrbit();

  window.setInterval("update(getCurrentTime())", 1000);
}


function addOrbit() {
  var wasSunlit = track[0].s;
  var trackSegmentCoords = new Array();

  for (var i=0; i<track.length; i++) {
    trackSegmentCoords.push(new google.maps.LatLng(track[i].lt, track[i].ln));
    if (i == 0)
      continue;

    if (track[i].s ^ wasSunlit) {    // change of sunlit state
      var lastGroundPoint = trackSegmentCoords.pop();

      drawTrackSegment(trackSegmentCoords, wasSunlit);

      trackSegmentCoords = new Array();
      trackSegmentCoords.push(lastGroundPoint);
    }

    wasSunlit = track[i].s;
  }

  drawTrackSegment(trackSegmentCoords, wasSunlit);
}


function drawTrackSegment(coordsArray, sunlit) {
  var sunlitColor = "#ff0000";
  var darkColor   = "#0000ff";
  var segmentColor = sunlit ? sunlitColor : darkColor;
  new google.maps.Polyline({
    map: map2,
    path: coordsArray,
    strokeColor: segmentColor,
    strokeOpacity: 0.5,
    strokeWeight: 2,
    clickable: false
  });
}


function update(time) {   // time in seconds since Jan. 01, 1970 UTC
  var state = getSatelliteState(time);
  updateMaps(state.time, state.lon, state.lat);
  updateCockpit(state.time, state.lon, state.lat, state.alt, state.speed);
}


function updateMaps(time, lon, lat) {   // time in seconds since Jan. 01, 1970 UTC
  var gndPnt = new google.maps.LatLng(lat, lon);
  crossHair1.setPosition(gndPnt);
  crossHair2.setPosition(gndPnt);
  map1.panTo(gndPnt);
  map2.panTo(new google.maps.LatLng(0.0, lon));
  if (Math.abs(time - lastDayNightOverlayUpdate) > 60) {
    updateDayNightOverlay(time*1000);
    lastDayNightOverlayUpdate = time;
  }
}


function updateCockpit(time, lon, lat, alt, speed) {   // time in seconds since Jan. 01, 1970 UTC
  var gptField = document.getElementById("gpt");
  gptField.innerHTML = getCoordinatesString(lon, lat);
  var timeField = document.getElementById("time");
  timeField.innerHTML = getUTCTimeString(time);
  var altField = document.getElementById("alt");
  var speedField = document.getElementById("speed");
  if (isMiles) {
    altField.innerHTML = Math.round(alt / MILE_IN_KM) + " miles";
    speedField.innerHTML = formatDecimal(speed / MILE_IN_KM, 3) + " miles / s<br />" + Math.round(speed * 3600.0 / MILE_IN_KM) + " mph";
  }
  else {
    altField.innerHTML = Math.round(alt) + " km";
    speedField.innerHTML = Math.round(speed * 1000.0) + " m/s<br />" + Math.round(speed * 3600.0) + " km/h";
  }
}


function getCoordinatesString(lon, lat) {
  var lonString = formatDecimal(Math.abs(lon), 2) + "\u00b0 " + (lon < 0 ? dict.west  : dict.east);
  var latString = formatDecimal(Math.abs(lat), 2) + "\u00b0 " + (lat < 0 ? dict.south : dict.north);
  return latString + "<br />" + lonString;
}


function formatDecimal(x, digits) {   // wird auch in prediction.js verwendet
  var decPoint = dict.decimalPoint;
  var f = Math.pow(10, digits);
  var g = "" + parseInt(x*f + (0.5 * (x>0 ? 1 : -1)));
  if (digits == 0)
    return g;
  if (x < 0)
    g = g.substring(1, g.length);
  while (g.length < digits+1)
    g = "0" + g;
  g = g.substring(0, g.length - digits) + decPoint + g.substring(g.length - digits, g.length);
  if (x < 0)
    g = "-" + g;
  return g;
}


function getUTCTimeString(time) {   // time in seconds since Jan. 01, 1970 UTC
  var t = new Date(time*1000);
  var utcHour = t.getUTCHours();
  if (utcHour < 10)
    utcHour = "0" + utcHour;
  var utcMinute = t.getUTCMinutes();
  if (utcMinute < 10)
    utcMinute = "0" + utcMinute;
  var utcSecond = t.getUTCSeconds();
  if (utcSecond < 10)
    utcSecond = "0" + utcSecond;
  return utcHour + ":" + utcMinute + ":" + utcSecond + " UTC";
}


function getCurrentTime() {   // time in seconds since Jan. 01, 1970 UTC
  return Math.round(new Date().getTime()/1000) - timeDiff;
}


function getSatelliteState(time) {   // time in seconds since Jan. 01, 1970 UTC
  if ( (time < track[0].t) || (time > track[track.length-1].t) ) {
    window.location.reload(true);
    return null;
  }

  try {
    var idx = getIndex(time);
    var state1 = track[idx];
    var state2 = track[idx+1];
    var factor = (time - state1.t) / (state2.t - state1.t);
    var lon   = state1.ln + (state2.ln - state1.ln) * factor;
    var lat   = state1.lt + (state2.lt - state1.lt) * factor;
    var alt   = state1.h + (state2.h - state1.h) * factor;
    var speed = state1.v + (state2.v - state1.v) * factor;
    return { time: time, lon: lon, lat: lat, alt: alt, speed: speed };
  }
  catch (ex) {
    window.location.reload(true);
    return null;
  }
}


function getIndex(time) {   // time in seconds since Jan. 01, 1970 UTC
  var i = 0;
  while ( (time > track[i].t) && (i < track.length) )
    i++;
  return i - 1;
}


function handleMiles(isMi) {
  isMiles = isMi;
}


// open snapshot map
function snapshot() {
  var center = map1.getCenter();
  var lon = center.lng();
  var lat = center.lat();
  var url = dict.snapshotURL + "?lon=" + lon + "&lat=" + lat;
  window.open(url);
}

