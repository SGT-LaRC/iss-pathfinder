var J2000_0 = 946728000000;
var RAD_PER_DEG = Math.PI / 180.0;
var DOUBLE_PI = 2.0 * Math.PI;
var MILLISECONDS_PER_CENTURY = 1000 * 3600 * 24 * 36525.0;

var dayNightOverlay;


function initializeDayNightOverlay(map, time) {
  var boundaryPoints = getDayNightBoundary(time);
  dayNightOverlay = new google.maps.Polygon({
    paths: boundaryPoints,
    strokeColor: "#808080",
    strokeOpacity: 0.4,
    strokeWeight: 0.1,
    fillColor: "#808080",
    fillOpacity: 0.4
  });
  dayNightOverlay.setMap(map);
}


function updateDayNightOverlay(time) {
  var boundaryPoints = getDayNightBoundary(time);
  dayNightOverlay.setPath(boundaryPoints);
}


function getDayNightBoundary(time) {
  var sunPos = getEquatorialSunPosition(time);
  var sunGndPt = getSunGroundPoint(time, sunPos);

  var sunLon = toRadians(sunGndPt.lng());
  var sunLat = toRadians(sunGndPt.lat());
  var boundary = new Array();
  for (var lonDeg=-180; lonDeg<=180; lonDeg+=5) {
    var lon = toRadians(lonDeg);
    var tanLat = -Math.cos(sunLon - lon) / Math.tan(sunLat);
    var lat = Math.atan(tanLat);
    var latDeg = toDegrees(lat);
    var pt = new google.maps.LatLng(latDeg, lonDeg);
    boundary.push(pt);
  }
  var nearPoleLat = (sunLat < 0.0) ? 85.0 : -85.0;
  for (var lonDeg=180; lonDeg>=-180; lonDeg-=60) {
    var pt = new google.maps.LatLng(nearPoleLat, lonDeg);
    boundary.push(pt);
  }
  boundary.push(boundary[0]);
  return boundary;
}


function getEquatorialSunPosition(time) {
  var n = (time - J2000_0) / 86400000.0;
  var lDeg = 280.460 + 0.9856474*n;
  var gDeg = 357.528 + 0.9856003*n;
  var g = toRadians(gDeg);
  var lambdaDeg = lDeg + 1.915*Math.sin(g) + 0.020*Math.sin(2.0*g);
  var lambda = toRadians(lambdaDeg);

  var eDeg = 23.4393 - 3.563e-7*n;
  var e = toRadians(eDeg);

  var sinLambda = Math.sin(lambda);
  var rectAsc = Math.atan2(Math.cos(e) * sinLambda, Math.cos(lambda));
  var decl = Math.asin(Math.sin(e) * sinLambda);

  return { rectAsc: rectAsc, decl: decl };
}


function getSunGroundPoint(time, sunPos) {
  var declDeg = toDegrees(sunPos.decl);
  var lonDeg  = toDegrees(sunPos.rectAsc - getGMST(time));
  var gpt = new google.maps.LatLng(declDeg, lonDeg);
  return gpt;
}


function getGMST0(time) {
  var tSinceJ2000_0 = time - J2000_0;
  var t = tSinceJ2000_0 / MILLISECONDS_PER_CENTURY;  // Julian centuries since J2000.0
  var gmst0Degrees = 100.46061837;
  gmst0Degrees += 36000.770053608 * t;
  gmst0Degrees += 3.87933e-4 * t*t;
  gmst0Degrees += t*t*t / 38710000.0;
  var gmst0Radians = toRadians(gmst0Degrees);
  return rev(gmst0Radians);
}


function getGMST(time) {
  var today0utc = new Date(time);
  today0utc.setUTCHours(0, 0, 0, 0);
  var utInMillis = time - today0utc.getTime();
  var ut = utInMillis / 3600000.0 / 12.0 * Math.PI;   // in radians
  return rev(getGMST0(time) + ut);
}


function toRadians(degrees) {
  return degrees * RAD_PER_DEG;
}


function toDegrees(radians) {
  return radians / RAD_PER_DEG;
}


function rev(angle) {
  return (angle - Math.floor(angle/DOUBLE_PI)*DOUBLE_PI);
}
