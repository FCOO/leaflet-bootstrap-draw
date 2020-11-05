/****************************************************************************
leaflet-bootstrap-draw-route.js

L.Route - Extend L.GeoPolyline with vessels (L.VesselMarker)

****************************************************************************/
(function ($, L/*, window, document, undefined*/) {
    "use strict";

    L.Route = L.GeoPolyline.extend({
        /*****************************************************
        initialize
        *****************************************************/
        initialize: function(options){
            L.GeoPolyline.prototype.initialize.call(this, options );
            this.options.vesselPane = this.id+'VesselPane';

            this.vesselList = [];
        },

        /*****************************************************
        addTo
        *****************************************************/
        addTo: function(map){
            //Get/create pane for all vessels
            this.$vesselPane = $(map._createSubMarkerPane(this.options.vesselPane, this.zIndex + 1));
            this.$vesselPane.css('pointer-events', 'none');

            return L.GeoPolyline.prototype.addTo.apply(this, arguments );
        },


        /*****************************************************
        beforeSetInteractive
        *****************************************************/
        beforeSetInteractive: function( beforeSetInteractive ){
            return function( on ){
                beforeSetInteractive.call( this, on );
                if (on){
                    //Move vesselPane below pane with polyline
                    this.$vesselPane
                        .detach()
                        .css('z-index', this.index)
                        .appendTo( this._map.geoPolylineEdit_Pane );

                }
            };
        }( L.GeoPolyline.prototype.beforeSetInteractive ),

        /*****************************************************
        afterSetInteractive
        *****************************************************/
        afterSetInteractive: function( afterSetInteractive ){
            return function( on ){
                afterSetInteractive.call( this, on );
                if (on)
                    this.backup();
                else
                    //Move vessel-pane back
                    this.$vesselPane
                        .detach()
                        .css('z-index', this.zIndex + 1)
                        .appendTo( this._map.getPane('markerPane') );
            };
        }( L.GeoPolyline.prototype.afterSetInteractive ),

        /*****************************************************
        _updateVesselIndex
        *****************************************************/
        _updateVesselIndex: function() {
            $.each( this.vesselList, function(index, vessel){
                vessel.index = index;
            });
        },

        /*****************************************************
        addVessel
        *****************************************************/
        addVessel: function( distance, options ){
            var vessel = new L.LatLngDistancePointVessel( distance, this.latLngPointMarkerList, options  );
            vessel.options = options;
            this.vesselList.push( vessel );
            this._updateVesselIndex();

            if (this.vesselMarkerLayerGroup)
                vessel.addToLayerGroup(this.vesselMarkerLayerGroup, this.options.vesselPane);
            vessel.update();
            return vessel;
        },

        /*****************************************************
        removeVessel
        *****************************************************/
        removeVessel: function( indexOrVessel ){
            var index = typeof indexOrVessel == 'number' ? indexOrVessel : indexOrVessel.index,
                vessel = this.vesselList[index];

            this.vesselList.splice(index, 1);
            this.updateVesselList();
            vessel.remove();
        },

        /*****************************************************
        onAdd
        *****************************************************/
        onAdd: function(){
            L.GeoPolyline.prototype.onAdd.apply(this, arguments );

            var _this = this;

            //Create layerGroup for vessels
            if (!this.vesselMarkerLayerGroup)
                this.vesselMarkerLayerGroup = L.layerGroup();
            this.vesselMarkerLayerGroup.addTo(this._map);

            $.each( this.vesselList, function(index, vessel){
                vessel.addToLayerGroup(_this.vesselMarkerLayerGroup, _this.options.vesselPane);
            });
        },

        /*****************************************************
        onRemove
        *****************************************************/
        onRemove: function(){
            L.GeoPolyline.prototype.onRemove.apply(this, arguments );

            //Remove vessels
            this.vesselMarkerLayerGroup.remove();
        },

        /*****************************************************
        updateVesselList
        *****************************************************/
        updateVesselList: function(){
            $.each( this.vesselList, function(index, vessel){
                vessel.update();
            });
        },


        /*****************************************************
        onBackup
        *****************************************************/
        onBackup: function( backupObj ){
            backupObj.vesselList = this.vesselList.slice();
        },

        /*****************************************************
        onRestore
        *****************************************************/
        onRestore: function( backupObj ){
            //Remove current vessels
            $.each( this.vesselList, function( index, vessel ){
                vessel.remove();
            });
            this.vesselList = [];

            //Restore vesselList
            var _this = this;
            $.each( backupObj.vesselList, function( dummy, vessel ){
                _this.addVessel( vessel.distance, vessel.marker.options );
            });
            this.updateVesselList();
        },

        /*****************************************************
        updatePolyline
        *****************************************************/
        updatePolyline: function(){
            L.GeoPolyline.prototype.updatePolyline.apply(this, arguments );

            //Set colors of first and last marker
            this.latLngPointMarkerList.lastPoint.setColor(this.options.isPolygon ? 'white' : 'danger');

            if (this.latLngPointMarkerList.lastPoint.prevPoint)
                this.latLngPointMarkerList.lastPoint.prevPoint.setColor('white');
            this.latLngPointMarkerList.firstPoint.setColor('success');

            //Update vessels
            this.updateVesselList();

        },

        /*****************************************************
        onSetAsCurrentOn, onSetAsCurrentOff
        Called by the map when the geoPolyline is set on/off as
        current geoPolyline
        *****************************************************/
        onSetAsCurrentOn: function(){
            this.$vesselPane.css('z-index', 1);
            return L.GeoPolyline.prototype.onSetAsCurrentOn.apply(this, arguments );
        },
        onSetAsCurrentOff: function(){
            this.$vesselPane.css('z-index', 0);
            return L.GeoPolyline.prototype.onSetAsCurrentOff.apply(this, arguments );
        },



    });


}(jQuery, L, this, document));