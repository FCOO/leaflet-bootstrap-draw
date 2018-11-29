Overview on objects in this packages


** Administration of latlng-points **
L.LatLngPoint - A point in the list
    L.LatLngDistancePoint - Extension of LatLngPoint representing a point on the polyline given by the distance from the start

L.LatLngPointList - A list of L.LatLngPoint


** Different decedents of Leaflet marker **
L.Marker
    L.VesselMarker = Marker using L.VesselIcon as icon (fcoo/leaflet-marker-vessel)

L.Marker (leaflet)
    L.BsMarker (from fcoo/leaflet-bootstrap): Round, color, shadow, puls
        L.LatLngMarker = Marker for points in GeoPolyline
            L.LatLngEditMarker = Marker for hover over line segment




leaflet-polyline.js - Extend L.Polyline with options to draw "shadow" and "interactive"-zone 


leaflet-latlng-geopolyline.js - Object representing a list of LatLng that represent a polyline or polygon



** Combination of a "point" (child of L.LatLngPoint) and a "marker". Are child of the point-class ***

L.latLngPoint
    L.LatLngPointMarker - Extend L.latLngPoint with draggable marker

L.LatLngDistancePoint
    L.LatLngDistancePointVessel - Extend L.LatLngDistancePoint with "vessel"-marker (L.VesselMarker)


*** TODO ***
L.LatLngPointMarkerList - Extend L.LatLngPointList with drag-events


*** TODO ***
L.GeoPolyline = L.Geodesic.extend
    L.Route - Extend L.GeoPolyline with vessels (L.VesselMarker)


*** PACKAGES ***
fcoo/leaflet-polyline: Extend L.Polyline with border, shadow and interactive zone
    leaflet.GeometryUtil : Utilities for lweaflet eq. find nearest point or line etc.

fcoo/leaflet-latlng-point: Double linked lists of LatLngPoint = with info on bearing, distance etc. to next and previuos point and total
    fcoo/leaflet-latlng-geodecy: Leaflet-version of latlon-spherical.js from https://github.com/chrisveness/geodesy with methods for latLng-points eq. bearingTo( latLng )

fcoo/leaflet-bootstrap-draw: Display and edit routs, circle etc.
    leaflet.Geodesic: Draw Leaflet polylines and geodesic-lines incl. circle
    fcoo/leaflet-polyline: See above