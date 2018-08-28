/****************************************************************************
leaflet-bootstrap-geopolyline.js,

Object representing a polyline or polygon as Geodesic
****************************************************************************/
(function ($, L, window, document, undefined) {
    "use strict";

    /******************************************************************
    *******************************************************************
    L.LatLngMarker     = Marker for points in GeoPolyline
    L.LatLngEditMarker = Marker for hover over line segment
    *******************************************************************
    ******************************************************************/
    var iconDim     = 12,
        iconSize    = [iconDim, iconDim],
        bigIconDim  = 30,
        bigIconSize = [bigIconDim, bigIconDim];

    L.LatLngMarker = L.BsMarker.extend({
        options: {
            draggable: true,
            icon     : L.divIcon({
                           iconSize : iconSize,
                           className: 'lbm-icon lbm-draw'
                       }),
            bigIcon  : L.divIcon({
                           iconSize : bigIconSize,
                           className: 'lbm-icon lbm-draw'
                       }),

            tooltip  : {
                da:'Træk for at ændre, klik for at fjerne',
                en:'Drag to change, click to remove'
            },
            bigIconWhenTouch: true,

        }
    });

    var bigIconClassName = 'lbm-icon lbm-draw hide-on-leaflet-dragging lbm-warning hide-for-no-mouse';
    L.LatLngEditMarker = L.LatLngMarker.extend({
        options: {
            icon   : L.divIcon({
                         iconSize : iconSize,
                         className: bigIconClassName
                     }),
            bigIcon: L.divIcon({
                         iconSize : bigIconSize,
                         className: bigIconClassName
                     }),

            opacity: 0
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

            this.marker.on('dragend',   this.onDragend,   this);
            this.marker.on('pouseup',   this.onDragend,   this);
            this.marker.on('click',     this.remove,      this );

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

    /******************************************************************
    *******************************************************************
    L.GeoPolyline
    *******************************************************************
    ******************************************************************/
    L.GeoPolyline = L.Geodesic.extend({
        options: {
            steps: 1,
            wrap : false,

            weight          : 2,
            opacity         : 1,
            color           : "black",
            addShadow       : true,
            addInteractive  : true,
            interactiveStyle: { width: (iconDim-2)/2 },
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

            //Set widther interactive-zone if browser is with touch
            if (window.bsIsTouch)
                this.options.interactiveStyle.width = (bigIconDim-2)/2;


            L.Geodesic.prototype.initialize.call(this, [[]], options );

            this.latLngPointMarkerList = new L.LatLngPointMarkerList({
                list            : this.options.list || this.options.pointList || [],
                isPolygon       : this.options.isPolygon,
                isRhumb         : this.options.isRhumb,
                pointConstructor: L.latLngPointMarker,
                onUpdate        : $.proxy(this.update, this)
            }, this);

            this.bindTooltip({
                da:'Klik for at tilføje',
                en:'Click to add'
            }, {sticky: true});

            this.editMarker = null; //Created on add to map

            this.on('mouseover', this.onMouseover, this );
            this.on('mousemove', this.onMousemove, this );
            this.on('mouseout',  this.onMouseout,  this );
            this.on('click',     this.onClick,     this );

            this.on('dragstart', this.onDragstart,     this );

            return this;

        },

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
            this._map.on('click', this._map_onClick, this );

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

            if (this.options.addInteractive && !this.editMarker){
                this.editMarker = new L.LatLngEditMarker([0,0], {pane: paneName}, this);
                this.interactiveLayerGroup.addLayer( this.editMarker );
            }

        },

        /*****************************************************
        onRemove
        *****************************************************/
        onRemove: function(){
            L.Geodesic.prototype.onRemove.apply(this, arguments );
            this._map.off('click', this._map_onClick, this );
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
        onMouseover( mouseEvent ){
            this.onMousemove( mouseEvent );
            this.editMarker.setOpacity(1);
        },
        onMousemove( mouseEvent ){
            this.editMarker.setLatLng( mouseEvent.latlng );
        },
        onMouseout( /*mouseEvent*/ ){
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
        _map_onClick( mouseEvent ){
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
        onSetInteractive
        *****************************************************/
        onSetInteractive: function( on ){
            if (on)
                this.backup();
            var pane = this._map && this.vesselMarkerPaneName ? this._map.getPane(this.vesselMarkerPaneName) : null;
            if (pane)
                $(pane).css('z-index', this.vesselPaneZIndex + (on ? 0 : 2 ));
        },

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
            this.latLngPointMarkerList.lastPoint.marker.setColor( this.options.isPolygon ? null : 'danger');

            if (this.latLngPointMarkerList.lastPoint.prevPoint)
                this.latLngPointMarkerList.lastPoint.prevPoint.marker.setColor();
            this.latLngPointMarkerList.firstPoint.marker.setColor('success');

            //Update vessels
            this.updateVesselList();

        }
    });


}(jQuery, L, this, document));



