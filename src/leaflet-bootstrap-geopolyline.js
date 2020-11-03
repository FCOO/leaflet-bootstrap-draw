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