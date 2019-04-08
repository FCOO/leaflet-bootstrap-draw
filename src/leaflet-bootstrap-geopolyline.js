/****************************************************************************
leaflet-bootstrap-geopolyline.js,

Object representing a polyline or polygon as Geodesic
****************************************************************************/
(function ($, L, window, document, undefined) {
    "use strict";

    /******************************************************************
    *******************************************************************
    L.GeoPolyline
    *******************************************************************
    ******************************************************************/
    L.GeoPolyline = L.Geodesic.extend({
        options: {
            //options for leaflet-bootstrap
            tooltip: {da:'Klik for at tilføje', en:'Click to add'},
            tooltipHideWhenDragging : true,
            tooltipHideWhenPopupOpen: true,

            //Options for L.Geodesic
            steps: 1,
            wrap : false,

            //options for L.Polyline
            addInteractive          : true,
            interactive             : false,
            addInteractiveLayerGroup: true,
            weight                  : 2,
            lineColorName           : "black",
            shadowWhenInteractive   : true,

            border          : true,
            shadow          : false,
            hover           : false,
            width           : 2,

            //options for GeoPolyline
            isPolygon       : false,
            isRhumb         : true,
        },

        /*****************************************************
        initialize
        *****************************************************/
        initialize: function(options){

            options = L.setOptions(this, options );

            options.addInteractive = true;
            options.events = options.events || {};

            L.Geodesic.prototype.initialize.call(this, [[]], options );

            this.latLngPointMarkerList = new L.LatLngPointMarkerList({
                list            : this.options.list || this.options.pointList || [],
                isPolygon       : this.options.isPolygon,
                isRhumb         : this.options.isRhumb,
                pointConstructor: L.latLngPointMarker,
                onUpdate        : $.proxy(this.update, this)
            }, this);

            if (!L.Browser.mobile)
                this.bindTooltip(this.options.tooltip);

            this.editMarker = null; //Created on add to map

            this.on('mouseover', this.onMouseover, this );
            this.on('mousemove', this.onMousemove, this );
            this.on('mouseout',  this.onMouseout,  this );
            this.on('click',     this.onClick,     this );

            this.on('dragstart', this.onDragstart, this );

            return this;

        },


        /*****************************************************
        TODO - getHtmlElements - used by leaflet-freeze to exclude elements from freezze
        *****************************************************/
        /*
        getHtmlElements: function(){
            return [this.editMarker, this.polylineList];
        },
        */
        /*****************************************************
        onAdd
        *****************************************************/
        onAdd: function(){
            L.Geodesic.prototype.onAdd.apply(this, arguments );

            var _this = this;
            $.each( this.latLngPointMarkerList.list, function(index, latLngPointMarker){
                latLngPointMarker.addToLayerGroup(_this.interactiveLayerGroup);
            });

            this.update();

            //Add a pane just under the pane with the polyline and put the editMarker there
            var paneName = this.editMarkerPaneName = 'under-overlay';
            if (!this._map.getPane(paneName)){
                this._map.createPane(paneName);
                //Get z-index from the pane where the polylines are in
                var zIndex = parseInt( $(this._map.getPane('overlayPane')).css('z-index') );
                $(this._map.getPane(paneName)).css({
                    'pointer-events': 'none',
                    'z-index': zIndex-1
                });
            }

            if (!L.Browser.mobile && this.options.addInteractive && !this.editMarker){
                this.editMarker = new L.LatLngEditMarker([0,0], {pane: paneName}, this);

                this.editMarker.$icon.addClass('hide-for-leaflet-dragging');
                this.editMarker.setOpacity(0);

                this.interactiveLayerGroup.addLayer( this.editMarker );
            }

        },

        /*****************************************************
        onRemove
        *****************************************************/
        onRemove: function(){
            this.setInteractiveOff();
            L.Geodesic.prototype.onRemove.apply(this, arguments );
        },

        /*****************************************************
        backup - Create a backup of the GeoPolyline
        *****************************************************/
        backup: function(){
            this._backup = {
                    isPolygon: this.options.isPolygon,
                    isRhumb  : this.options.isRhumb,
                    list     : []
                };
            var _this = this;
            $.each(this.latLngPointMarkerList.list, function(index, latLng){
                _this._backup.list.push([latLng.lat, latLng.lng]);
            });
            this.onBackup( this._backup );
        },
        onBackup: function( /*backupObj*/ ){
        },

        /*****************************************************
        restore - Restore the backup of the GeoPolyline
        *****************************************************/
        restore: function(){
            if (!this._backup) return;
            //Remove current points
            while (this.latLngPointMarkerList.list.length){
                this.latLngPointMarkerList.list[0].remove();
            }
            //Restore saved points
            var _this = this;
            $.each( this._backup.list, function(index, latLng){
                _this.appendLatLng( latLng );
            });

            this.setPolygon(this._backup.isPolygon);
            this.setRhumb(this._backup.isRhumb);

            this.onRestore( this._backup );

            this._backup = null;
        },
        onRestore: function( /*backupObj*/ ){
        },


        /*****************************************************
        beforeSetInteractive
        Freez all other elements
        *****************************************************/
        beforeSetInteractive: function( beforeSetInteractive ){
            return function( on ){
                if (on){
                    this._map.freeze({
                        allowZoomAndPan : true,  //If true zoom and pan is allowed
                        disableMapEvents: '',    //Names of events on the map to be disabled
                        hideControls    : false, //If true all leaflet-controls are hidden
                        hidePopups      : true,  //If true all open popups are closed on freeze
                        //beforeFreeze    : function(map, options) (optional) to be called before the freezing
                        //afterThaw       : function(map, options) (optional) to be called after the thawing
                        //dontFreeze      : this  //leaflet-object, html-element or array of ditto with element or "leaflet-owner" no to be frozen
                    });

                    this._map.on('click', this._map_onClick, this );
                }
                beforeSetInteractive.call( this, on );
                return this;
            };
        }( L.Geodesic.prototype.beforeSetInteractive ),

        /*****************************************************
        afterSetInteractive
        Thaw all other elements
        *****************************************************/
        afterSetInteractive: function( afterSetInteractive ){
            return function( on ){
                if (!on){
                    this._map.thaw();
                    this._map.off('click', this._map_onClick, this );
                }

                afterSetInteractive.call( this, on );
                return this;
            };
        }( L.Geodesic.prototype.afterSetInteractive ),

        /*****************************************************
        setBorderColor
        Overwrite default method to include setting color for
        all marker in this.latLngPointMarkerList and this.editMarker
        *****************************************************/
        setBorderColor: function( setBorderColor ){
            return function( borderColorName ){
                setBorderColor.call( this, borderColorName );

                if (this.latLngPointMarkerList)
                    $.each( this.latLngPointMarkerList.list, function(index, latLngPointMarker){
                        latLngPointMarker.setBorderColor( borderColorName );
                });
                if (this.editMarker)
                    this.editMarker.setBorderColor( borderColorName );

            };
        }( L.Geodesic.prototype.setBorderColor ),

        /*****************************************************
        setPolygon and setRhumb
        *****************************************************/
        _setAny: function(id, value){
            value = value === undefined ? !this.options[id] : value;
            this.options[id] = value;
            this.latLngPointMarkerList.options[id] = value;
            if (this.latLngPointMarkerList)
                this.latLngPointMarkerList.update();
            else
                this.update();
        },
        setPolygon: function(isPolygon){ this._setAny('isPolygon', isPolygon); },
        setRhumb  : function(isRhumb)  { this._setAny('isRhumb'  , isRhumb  ); },

        /*****************************************************
        update
        *****************************************************/
        update: function(){
            if (!this.latLngPointMarkerList || !this.latLngPointMarkerList.list.length) return;
            this.updatePolyline();
            if (this.options.onUpdate)
                this.options.onUpdate(this.latLngPointMarkerList, this.latLngPointMarkerList.currentLatLngPoint);
        },

        /*****************************************************
        updatePolyline
        *****************************************************/
        updatePolyline: function(){
           var latLngList = [],
                latLngs = [];
            $.each( this.latLngPointMarkerList.list, function(index, latLngPointMarker){
                latLngList.push( L.latLng( latLngPointMarker ));
            });
            if (this.options.isPolygon)
                latLngList.push( L.latLng( this.latLngPointMarkerList.firstPoint ) );

            for (var i=1; i<latLngList.length; i++ )
                latLngs.push( [latLngList[i-1], latLngList[i]] );

            this.options.steps = this.options.isRhumb ? 1 : 50;
            this.setLatLngs(latLngs);
        },

        /******************************************************
        appendLatLng
        ******************************************************/
        appendLatLng: function( latLng ){
            return this.insertLatLng( latLng );
        },

        /******************************************************
        insertLatLng
        *******************************************************/
        insertLatLng: function( latLng, index ){
            var newPoint = this.latLngPointMarkerList.insert( latLng, index );
            newPoint.addToLayerGroup(this.interactiveLayerGroup);
            newPoint.setBorderColor( this.options.borderColorName );

            this.update();
            return newPoint;
        },

        /*****************************************************
        onDragEvent
        *****************************************************/
        onDragEvent: function(type){
            if (this.options.events[type])
                this.options.events[type]( type, this.latLngPointMarkerList, this.latLngPointMarkerList.currentLatLngPoint );
        },

        /*****************************************************
        onDragstart
        *****************************************************/
        onDragstart: function(){
        },

        /******************************************************
        Events on interactive layer
        ******************************************************/
        onMouseover: function( mouseEvent ){
            this.onMousemove( mouseEvent );
            if (this.editMarker)
                this.editMarker.setOpacity(1);
        },
        onMousemove: function( mouseEvent ){
            if (this.editMarker)
                this.editMarker.setLatLng( mouseEvent.latlng );
        },
        onMouseout: function( /*mouseEvent*/ ){
            if (this.editMarker)
                this.editMarker.setOpacity(0);
        },

        /******************************************************
        onClick: Find segment-index and add new point after segment first point
        ******************************************************/
        onClick: function( mouseEvent ){
            var insertAfterIndex = -1,
                latLng = mouseEvent.latlng,
                latLngs = this.getLatLngs(),
                closestLayer = L.GeometryUtil.closestLayer(this._map, latLngs, latLng),
                firstLagLngOfClosestLayer = closestLayer.layer ? closestLayer.layer[0] : null;

            if (firstLagLngOfClosestLayer)
                $.each(latLngs, function(index, latLngList ){
                if (latLngList[0].equals(firstLagLngOfClosestLayer)){
                    insertAfterIndex = index;
                    return false;
                }
            });

            if (insertAfterIndex != -1)
                this.insertLatLng( latLng, insertAfterIndex );

            L.DomEvent.stop( mouseEvent );
        },

        /******************************************************
        Events on map
        ******************************************************/
        _map_onClick: function( mouseEvent ){
            if (this.isInteractive){
                this.appendLatLng( mouseEvent.latlng );
                L.DomEvent.stop( mouseEvent );
            }
        }
    });


    /******************************************************************
    *******************************************************************
    L.Route - Extend L.GeoPolyline with vessels (L.VesselMarker)
    *******************************************************************
    ******************************************************************/
    L.Route = L.GeoPolyline.extend({
        /*****************************************************
        initialize
        *****************************************************/
        initialize: function(options){
            L.GeoPolyline.prototype.initialize.call(this, options );
            this.vesselList = [];
        },

        /*****************************************************
        afterSetInteractive
        *****************************************************/
        afterSetInteractive: function( afterSetInteractive ){
            return function( on ){
                afterSetInteractive.call( this, on );
                if (on)
                    this.backup();
                var pane = this._map && this.vesselMarkerPaneName ? this._map.getPane(this.vesselMarkerPaneName) : null;
                if (pane)
                    $(pane).css('z-index', this.vesselPaneZIndex + (on ? 0 : 2 ));
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

            if (this.vesselMarkerLayerGroup && this.vesselMarkerPaneName)
                vessel.addToLayerGroup(this.vesselMarkerLayerGroup, this.vesselMarkerPaneName);
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

            //Create pane and layerGroup for vessels TODO MANGLER
            //Add a pane just under the pane with the edit-marker and put the vessel-markers there
            var paneName = this.vesselMarkerPaneName = 'route-vessel';

            if (!this._map.getPane(paneName)){
                this._map.createPane(paneName);
                this.vesselPaneZIndex = parseInt( $(this._map.getPane(this.editMarkerPaneName)).css('z-index') ) - 1;

                $(this._map.getPane(paneName)).css({
                    'pointer-events': 'none',
                    'z-index': this.vesselPaneZIndex
                });
            }

            if (!this.vesselMarkerLayerGroup)
                this.vesselMarkerLayerGroup = L.layerGroup();
            this.vesselMarkerLayerGroup.addTo(this._map);

            $.each( this.vesselList, function(index, vessel){
                vessel.addToLayerGroup(_this.vesselMarkerLayerGroup, paneName);
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

        }
    });


}(jQuery, L, this, document));