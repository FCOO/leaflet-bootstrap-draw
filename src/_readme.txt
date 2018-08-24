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
