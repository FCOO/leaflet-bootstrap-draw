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
;
/****************************************************************************
    leaflet-bootstrap-draw.js,

    (c) 2018, FCOO

    https://github.com/FCOO/leaflet-bootstrap-draw
    https://github.com/FCOO

****************************************************************************/
(function (/*$, L, window, document, undefined*/) {
    "use strict";




/*
    //Extend base leaflet class
    L.LeafletBootstrapDraw = L.Class.extend({
        includes: L.Mixin.Events,

    //or extend eq. L.Control
    //L.Control.LeafletBootstrapDraw = L.Control.extend({

    //Default options
        options: {
            VERSION: "2.1.0"

        },

        //initialize
        initialize: function(options) {
            L.setOptions(this, options);

        },

        //addTo
        addTo: function (map) {
            L.Control.prototype.addTo.call(this, map); //Extend eq. L.Control

            return this;
        },


        //onAdd
        onAdd: function (map) {
            this._map = map;
            var result = L.Control.Box.prototype.onAdd.call(this, map );

            //Create the object/control


            return result;
        },

        //myMethod
        myMethod: function () {

        }
    });
*/
    //OR/AND extend a prototype-method (METHOD) of a leaflet {CLASS}

    /***********************************************************
    Extend the L.{CLASS}.{METHOD} to do something more
    ***********************************************************/
/*
    L.{CLASS}.prototype.{METHOD} = function ({METHOD}) {
        return function () {
    //Original function/method
    {METHOD}.apply(this, arguments);

    //New extended code
    ......extra code

        }
    } (L.{CLASS}.prototype.{METHOD});
*/


}(jQuery, L, this, document));




;
/****************************************************************************
leaflet-bootstrap-geopolyline.js,

Object representing a polyline or polygon as Geodesic
****************************************************************************/
(function ($, L, window, document, undefined) {
    "use strict";

    //Default z-index for L.GeoPolyline
    window.L_GEOPOLYLINE_ZINDEX = 100;

    var geoPolylineEdit_Pane       = 'geoPolylineEdit',
        geoPolylineEdit_MarkerPane = 'geoPolylineEdit_Marker';

    //Create a pane and markerPane above 'normal' markerPane to be used when a L.GeoPolyline is been edited
    L.Map.addInitHook(function () {
        this.interactiveGeoPolylines = 0;
        this.geoPolylines = {};

        var markerPane_zIndex = parseInt( $(this.getPane('markerPane')).css('z-index') );

        this.geoPolylineEdit_Pane = this.createPane(geoPolylineEdit_Pane);
        $(this.geoPolylineEdit_Pane).css({
            'pointer-events': 'none',
            'z-index'       : parseInt(markerPane_zIndex) + 1
        });
        this.geoPolylineEdit_MarkerPane = this.createPane(geoPolylineEdit_MarkerPane);
        $(this.geoPolylineEdit_MarkerPane).css({
            'pointer-events': 'none',
            'z-index'       : parseInt(markerPane_zIndex) + 1 + 20
        });

        this.on('click', this._onClick_geoPolyline, this);

    });

    L.Map.include({
        /***********************************************************
        Map.createSubPane - Creates a new pane under the main pane
        ***********************************************************/
        _createSubPane: function(name, parentPaneName, zIndex, classNames=''){
            var newPane = this.getPane(name);
            if (!newPane){
                var parentPane = this.getPane(parentPaneName) || this.getPane(parentPaneName+'Pane');
                newPane = this.createPane(name, parentPane);
                newPane.style.zIndex = zIndex;
                $(newPane).addClass(classNames);
            }
            return newPane;
        },

        _createSubMarkerPane: function(name, zIndex, classNames=''){
            return this._createSubPane(name, 'markerPane', zIndex, classNames);
        },

        _createSubOverlayPane: function(name, zIndex, classNames=''){
            return this._createSubPane(name, 'overlayPane', zIndex, classNames);
        },

        /***********************************************************
        Map._currentGeoPolyline = the L.GeoPolyline having 'focus'
        Map._setCurrentGeoPolyline( geoPolyline ) - Sets and update the current
        ***********************************************************/
        _setCurrentGeoPolyline: function( geoPolyline ) {
            if (this._currentGeoPolyline === geoPolyline)
                return;
            if (this._currentGeoPolyline)
                this._currentGeoPolyline.onSetAsCurrentOff();
            this._currentGeoPolyline = geoPolyline;
            if (this._currentGeoPolyline)
                this._currentGeoPolyline.onSetAsCurrentOn();
        },

        /***********************************************************
        ***********************************************************/
        _onClick_geoPolyline: function(mouseEvent){
            if (this._currentGeoPolyline)
                this._currentGeoPolyline._map_onClick(mouseEvent);
            else {
//MANGLER - find nærmeste geoPolyline (if any)
            }
        }

    });


    /******************************************************************
    *******************************************************************
    L.GeoPolyline
    *******************************************************************
    ******************************************************************/
    var geoPolylineCount = 0;
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

            //options for edit-marker = marker on line when mouse is oer to mark "Add new point"
            hasEditMarker : true
        },

        /*****************************************************
        initialize
        *****************************************************/
        initialize: function(options){
            this.index = geoPolylineCount++;
            this.id = 'geopolyline' + this.index;
            this.zIndex = this.options.zIndex || window.L_GEOPOLYLINE_ZINDEX + 10*this.index;

            options = L.setOptions(this, options );

            options.addInteractive = true;
            options.events = options.events || {};

            options.pane = this.id+'Pane';
            options.markerPane = this.id+'MarkerPane';

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
        addTo
        *****************************************************/
        addTo: function(map){
            //Get/create all panes
            this.$pane = $(map._createSubOverlayPane(this.options.pane, this.zIndex));
            this.$markerPane = $(map._createSubMarkerPane(this.options.markerPane, this.zIndex));

            map.geoPolylines[this.id] = this;

            return L.Geodesic.prototype.addTo.apply(this, arguments );
        },

        /*****************************************************
        onAdd
        *****************************************************/
        onAdd: function(map){
            var _this = this;

            this.isInteractive = false;

            L.Geodesic.prototype.onAdd.apply(this, arguments );

            $.each( this.latLngPointMarkerList.list, function(index, latLngPointMarker){
                latLngPointMarker.addToLayerGroup(_this.interactiveLayerGroup, _this.options.markerPane);
            });

            this.update();

            //Add a edit-marker to the edit-pane in its own pane (not edit-marker-pane) just below the polyline
            if (!L.Browser.mobile && this.options.hasEditMarker && this.options.addInteractive && !this.editMarker){
                var paneName = this.options.pane + '_editMarker';
                this.editMarkerPane = map._createSubPane(paneName, this.options.pane, 1);
                $(this.editMarkerPane).css('pointer-events', 'none');

                this.editMarker = new L.LatLngEditMarker([0,0], {pane: paneName}, this);
                this.editMarker.$icon
                    .css('z-index', this.zIndex-1)
                    .addClass('hide-for-leaflet-dragging');

                this.editMarker.addTo(map);
            }

            this.setZIndex();

        },

        /*****************************************************
        onRemove
        *****************************************************/
        onRemove: function(map){
            this.setInteractiveOff();
            delete map.geoPolylines[this.id];
            map._setCurrentGeoPolyline(null);
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
        XX_beforeSetInteractive: function( beforeSetInteractive ){
            return function( on ){
                if (on){
                    if (!this._map.interactiveGeoPolylines)
                        //First time
                        this._map.freeze({
                            allowZoomAndPan : true,  //If true zoom and pan is allowed
                            disableMapEvents: '',    //Names of events on the map to be disabled
                            hideControls    : false, //If true all leaflet-controls are hidden
                            hidePopups      : true,  //If true all open popups are closed on freeze
                            //beforeFreeze    : function(map, options) (optional) to be called before the freezing
                            //afterThaw       : function(map, options) (optional) to be called after the thawing
                            //dontFreeze      : this  //leaflet-object, html-element or array of ditto with element or "leaflet-owner" no to be frozen
                        });

                    this._map.interactiveGeoPolylines++;

                    //Move all panes into map.geoPolylineEdit_Pane/map.geoPolylineEdit_MarkerPane and adjust z-index to have marker above lines
                    this.$pane.detach().appendTo(this._map.geoPolylineEdit_Pane);
                    this.$markerPane.detach().appendTo(this._map.geoPolylineEdit_MarkerPane);

                    this._map._setCurrentGeoPolyline(this);

                }
                beforeSetInteractive.call( this, on );
                return this;
            };
        }( L.Geodesic.prototype.beforeSetInteractive ),

        /*****************************************************
        afterSetInteractive
        Thaw all other elements
        *****************************************************/
        XX_afterSetInteractive: function( afterSetInteractive ){
            return function( on ){
                if (!on){
                    this._map.interactiveGeoPolylines--;

                    if (!this._map.interactiveGeoPolylines){
                        this._map.thaw();
                    }

                    //Move all panes back into map.overlayPane and map.markerPane
                    this.$pane.detach().appendTo( this._map.getPane('overlayPane') );
                    this.$markerPane.detach().appendTo( this._map.getPane('markerPane') );

                    this._map._setCurrentGeoPolyline(null);

                }

                afterSetInteractive.call( this, on );
                return this;
            };
        }( L.Geodesic.prototype.afterSetInteractive ),


        /*****************************************************
        setAsCurrent
        *****************************************************/
        setAsCurrent: function(){
            this._map._setCurrentGeoPolyline(this);
        },


        /*****************************************************
        onSetAsCurrentOn, onSetAsCurrentOff
        Called by the map when the geoPolyline is set on/off as
        current geoPolyline
        *****************************************************/
        onSetAsCurrentOn: function(){
            this.setZIndexOffset(1000);
        },
        onSetAsCurrentOff: function(){
            this.setZIndexOffset(0);
        },


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
        setZIndex
        *****************************************************/
        setZIndex: function(zIndex){
            return this._setZIndex(zIndex);
        },

        /*****************************************************
        setZIndexOffset
        *****************************************************/
        setZIndexOffset: function(zIndexOffset = 0){
            return this._setZIndex(this.zIndex + zIndexOffset);
        },

        _setZIndex: function(zIndex = this.zIndex){
            this.$pane.css('z-index', zIndex);
            this.$markerPane.css('z-index', zIndex);
            return this;
        },


        /*****************************************************
        update
        *****************************************************/
        update: function(){
            if (!this.latLngPointMarkerList || !this.latLngPointMarkerList.list.length) return;

            this.updatePolyline();
            if (this.options.onUpdate)
                this.options.onUpdate(this.latLngPointMarkerList, this.latLngPointMarkerList.currentLatLngPoint);

            if (this._map)
                this._map._setCurrentGeoPolyline(this);

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
            newPoint.addToLayerGroup(this.interactiveLayerGroup, this.options.markerPane);
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

}(jQuery, L, this, document));
;
/****************************************************************************
leaflet-bootstrap-latlng-marker.js,

Object representing a marker on a geopolyline
****************************************************************************/
(function ($, L/*, window, document, undefined*/) {
    "use strict";

    /******************************************************************
    NOTE
    Due to a bug in Chrome the edit-marker and tooltips are not added on
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



