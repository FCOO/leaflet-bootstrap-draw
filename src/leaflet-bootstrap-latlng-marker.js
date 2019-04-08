/****************************************************************************
leaflet-bootstrap-latlng-marker.js,

Object representing a marker on a geopolyline
****************************************************************************/
(function ($, L/*, window, document, undefined*/) {
    "use strict";

    /******************************************************************
    NOTE
    Due to a bug in Chrome the edit-mrker and tooltips are only added on
    mobile devices.
    The bug make Chrome fire mouseover on touch devices leaving the tooltip 'hanging'
    because no mouseout is fired
    ******************************************************************/


    /*****************************************************************
    *******************************************************************
    L.LatLngMarker     = Marker for points in GeoPolyline
    L.LatLngEditMarker = Marker for hover over line segment
    *******************************************************************
    ******************************************************************/
    L.LatLngMarker = L.BsMarkerCircle.extend({
        options: {
            draggable       : true,
            size            : 'sm',
            colorName       : 'white',
            round           : true,
            useTouchSize    : true,
            hover           : true,
            thickBorder     : true,

            tooltip  : L.Browser.mobile ? null : {
                da:'Træk for at ændre, klik for at fjerne',
                en:'Drag to change, click to remove'
            },
            tooltipHideWhenDragging : true,
            tooltipHideWhenPopupOpen: true

        },

        initialize: function(latLng, options){
            L.BsMarkerCircle.prototype.initialize.call(this, latLng, options);
            this.updateIcon();
        }
    });


    L.LatLngEditMarker = L.LatLngMarker.extend({
        options: {
            colorName  : 'warning',
            thickBorder: true,
            tooltip    : '',
        }
    });

    /******************************************************************
    *******************************************************************
    LatLngPointMarker_include - include for different varaitions of L.LatLngPointMarker
    *******************************************************************
    ******************************************************************/
    var LatLngPointMarker_include = {
        /*****************************************************
        addToLayerGroup
        *****************************************************/
        addToLayerGroup: function( layerGroup, markerPane ){
            this.layerGroup = this.layerGroup || layerGroup;
            if (markerPane)
                this.marker.options.pane = markerPane;
            if (this.layerGroup && !this.layerGroup.hasLayer(this.marker))
                this.layerGroup.addLayer(this.marker);
        },

        /*****************************************************
        onRemove
        *****************************************************/
        onRemove: function(){
            if (this.layerGroup && this.layerGroup.hasLayer(this.marker))
                this.layerGroup.removeLayer(this.marker);
        },

    };

    /******************************************************************
    *******************************************************************
    L.LatLngPointMarker - Extend L.latLngPoint with draggable marker
    *******************************************************************
    ******************************************************************/
    L.LatLngPointMarker = L.LatLngPoint.extend({
        /*****************************************************
        initialize
        *****************************************************/
        initialize: function( latLng, latLngPointlist ){
            L.LatLngPoint.prototype.initialize.call(this, latLng, latLngPointlist);
            this.marker = new L.LatLngMarker(latLng);
            this.marker.on('dragstart', this.onDragstart, this);

            this.marker.on('drag',      this.onDrag,      this);
            this.marker.on('mousemove', this.onDrag,      this);
            this.mousemoveAdded = true;

            this.marker.on('dragend',   this.onDragend,   this);
            this.marker.on('mouseup',   this.onDragend,   this);
            this.marker.on('click',     this.remove,      this );

        },


        /*****************************************************
        setColor
        *****************************************************/
        setColor: function( colorName ){
            this.marker.setColor( colorName );
        },

        /*****************************************************
        setBorderColor
        *****************************************************/
        setBorderColor: function( borderColorName ){
            this.marker.setBorderColor( borderColorName );
        },

        /*****************************************************
        onDragstart
        *****************************************************/
        onDragstart: function(/*mouseEvent*/){
            this.lastLatLng = L.latLng(0,0);

            this.latLngPointlist.currentLatLngPoint = this;
            this.onDragEvent('dragstart');
        },

        /*****************************************************
        onDrag
        *****************************************************/
        onDrag: function(mouseEvent){
            if (!this.lastLatLng || this.lastLatLng.equals(mouseEvent.latlng)){
                return;
            }

            //Remove mousemove event if drag is supported to minimize events fired
            if ((mouseEvent.type == 'drag') && this.mousemoveAdded){
                this.mousemoveAdded = false;
                this.marker.off('mousemove', this.onDrag, this);
            }

            this.lastLatLng = mouseEvent.latlng;
            this.lat  = mouseEvent.latlng.lat;
            this.lng = mouseEvent.latlng.lng;
            this.update();
        },

        /*****************************************************
        onDragend
        *****************************************************/
        onDragend: function(mouseEvent){
            if (!this.lastLatLng)
                return;

            //Fire drag one last time to get
            mouseEvent.latlng = mouseEvent.target.getLatLng();
            this.onDrag( mouseEvent );

            this.latLngPointlist.currentLatLngPoint = null;
            this.onDragEvent('dragend');
            this.lastLatLng = null;

        },

        /*****************************************************
        onDragEvent
        *****************************************************/
        onDragEvent: function( type ){
            this.latLngPointlist.onDragEvent( type );
        },


        /*****************************************************
        onUpdate
        *****************************************************/
        onUpdate: function(){
            this.marker.setLatLng( this );
        },

    });
    L.LatLngPointMarker.include( LatLngPointMarker_include );

    L.latLngPointMarker = function( latLng, latLngPointlist ){ return new L.LatLngPointMarker( latLng, latLngPointlist ); };


    /******************************************************************
    *******************************************************************
    L.LatLngDistancePointVessel
    Extend L.LatLngDistancePoint with "vessel"-marker (L.VesselMarker)
    *******************************************************************
    ******************************************************************/
    L.LatLngDistancePointVessel = L.LatLngDistancePoint.extend({
        /*****************************************************
        initialize
        *****************************************************/
        initialize: function( distance, latLngPointlist, options ){
            L.LatLngDistancePoint.prototype.initialize.call(this, distance, latLngPointlist);
            this.marker = L.vesselMarker( this, options );
        },

        /*****************************************************
        update
        *****************************************************/
        update: function(){
            L.LatLngDistancePoint.prototype.update.call(this);

            //Update vessel
            if (this.marker){
                this.marker.setLatLng( this );
                this.marker.setHeading( this.bearing );
                this.marker.setOpacity( this.exists ? 1 : 0 );
            }
        }
    });
    L.LatLngDistancePointVessel.include( LatLngPointMarker_include );


    /******************************************************************
    *******************************************************************
    L.LatLngPointMarkerList - Extend L.LatLngPointList with drag-events
    *******************************************************************
    ******************************************************************/
    L.LatLngPointMarkerList = L.LatLngPointList.extend({
        /*****************************************************
        initialize
        *****************************************************/
        initialize: function( options, polyline ){
            L.LatLngPointList.prototype.initialize.call(this, options);
            this.polyline = polyline;
        },

        /*****************************************************
        onDragEvent
        *****************************************************/
        onDragEvent: function(type){
            this.polyline && this.polyline.onDragEvent ? this.polyline.onDragEvent( type ) : null;
        }
    });

}(jQuery, L, this, document));



