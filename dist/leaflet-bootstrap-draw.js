/****************************************************************************
leaflet-latlng-pointConstructor.js

Object representing a list of LatLng that represent a polyline or polygon
****************************************************************************/
(function ($, L, window, document, undefined) {
    "use strict";

    /******************************************************************
    *******************************************************************
    L.LatLngPoint = A point in the list
    *******************************************************************
    ******************************************************************/
    L.LatLngPoint = L.Class.extend({
        /*****************************************************
        initialize
        *****************************************************/
        initialize: function( latLng, latLngPointlist ){

            this.latLngPointlist = latLngPointlist;

            //Workaround that L.LatLng isn't a real constructor
            latLng = L.latLng( latLng );

            this.lat = latLng.lat;
            this.lng = latLng.lng;

            this.prevPoint = null;
            this.nextPoint = null;

            this.prev = {};
            this.next = {};
        },

        /*****************************************************
        update
        *****************************************************/
        update: function(){
            this.latLngPointlist.update();
        },

        /*****************************************************
        _update
        *****************************************************/
        _update: function( prevLatLngPoint, nextLatLngPoint ){
            this.prevPoint = prevLatLngPoint;
            this.nextPoint = nextLatLngPoint;
            this.totalDistance = 0;
            this.totalRhumbDistance = 0;
            if (this.prevPoint){
                this.prev = {
                    distance     : this.prevPoint.next.distance      || this.prevPoint.distanceTo( this ),
                    bearing      : this.prevPoint.next.bearing       || this.prevPoint.bearingTo( this ),
                    finalBearing : this.prevPoint.next.finalBearing  || this.prevPoint.finalBearingTo( this ),
                    rhumbDistance: this.prevPoint.next.rhumbDistance || this.prevPoint.rhumbDistanceTo( this ),
                    rhumbBearing : this.prevPoint.next.rhumbBearing  || this.prevPoint.rhumbBearingTo( this ),
                };
                this.totalDistance      = this.prevPoint.totalDistance      + this.prev.distance;
                this.totalRhumbDistance = this.prevPoint.totalRhumbDistance + this.prev.rhumbDistance;

                this.prev.finalRhumbBearing  = this.prev.rhumbBearing;
                this.prev.totalDistance      = this.totalDistance;
                this.prev.totalRhumbDistance = this.totalRhumbDistance;

            }
            if (this.nextPoint){
                this.next = {
                    distance     : this.distanceTo( this.nextPoint ),
                    bearing      : this.bearingTo( this.nextPoint ),
                    finalBearing : this.finalBearingTo( this.nextPoint ),
                    rhumbDistance: this.rhumbDistanceTo( this.nextPoint ),
                    rhumbBearing : this.rhumbBearingTo( this.nextPoint ),
                };
                this.next.finalRhumbBearing  = this.next.rhumbBearing;
                this.next.totalDistance      = this.totalDistance + this.next.distance;
                this.next.totalRhumbDistance = this.totalRhumbDistance + this.next.rhumbDistance;
            }
        },

        /*****************************************************
        onUpdate
        *****************************************************/
        onUpdate: function(){},

        /*****************************************************
        remove
        *****************************************************/
        remove: function(){
            this.latLngPointlist.remove( this.index );
        },

        /*****************************************************
        onRemove
        *****************************************************/
        onRemove: function(){}
    });

    //Extend LatLngPoint with L.LatLng
	$.extend( L.LatLngPoint.prototype, L.LatLng.prototype );

    L.latLngPoint = function( latLng, latLngPointlist){ return new L.LatLngPoint(latLng, latLngPointlist); };


    /******************************************************************
    *******************************************************************
    L.LatLngDistancePoint - Extension of LatLngPoint representing
    a point on the polyline given by the distance from the start
    *******************************************************************
    ******************************************************************/
    L.LatLngDistancePoint = L.LatLngPoint.extend({
        /*****************************************************
        initialize
        *****************************************************/
        initialize: function( distance, latLngPointlist ){
            L.LatLngPoint.prototype.initialize.call(this, [0,0], latLngPointlist);
            this.distance = null;
            this.bearing = null;
            this.exists = false;
            this.setDistance( distance );
        },

        /*****************************************************
        setDistance - Set new distance and update
        *****************************************************/
        setDistance: function( distance ){
            this.distance = distance;
            this.update();
        },

        /*****************************************************
        update - Calculate the position and bering on the
        latLngPointlist distance from the start point
        *****************************************************/
        update: function(){
            var _this = this,
                distance = this.distance,
                isRhumb = this.latLngPointlist.options.isRhumb,
                list = this.latLngPointlist.list,
                distanceFraction, latLng = null;

            this.exists = false;
            this.lat = 0;
            this.lng = 0;

            function getTotalDistance( obj ){ return isRhumb ? obj.totalRhumbDistance : obj.totalDistance; }

            if ( (distance == null) || (distance < 0) || (distance > getTotalDistance( this.latLngPointlist )) || (list.length < 2) )
                return;

            //Find the segment where the distance lies between
            $.each( list, function( index, latLngPoint ){
                if ( (distance >= getTotalDistance(latLngPoint)) &&
                     latLngPoint.nextPoint &&
                     (distance <= getTotalDistance(latLngPoint.next)) ){
                    _this.exists = true;
                    distanceFraction = distance - getTotalDistance(latLngPoint);
                    if (isRhumb){
                        latLng = latLngPoint.rhumbDestinationPoint(distanceFraction, latLngPoint.next.rhumbBearing);
                    }
                    else {
                        //Calculate the fraction between this.prevPoint and this.nextPoint
                        var fraction = distanceFraction / ( getTotalDistance(latLngPoint.next) - getTotalDistance(latLngPoint) );
                        latLng = latLngPoint.intermediatePointTo(latLngPoint.nextPoint, fraction);
                    }

                    _this.lat = latLng.lat;
                    _this.lng = latLng.lng;
                    _this._update(latLngPoint, latLngPoint.nextPoint);
                    _this.bearing = isRhumb ? _this.next.rhumbBearing : _this.next.bearing;
                    return false;
                }
            });
        },

        /*****************************************************
        remove - Don't remove this from list. Only call this.onRemove
        *****************************************************/
        remove: function(){
            this.onRemove();
        }
    });

    /******************************************************************
    *******************************************************************
    L.LatLngPointList = A list of L.LatLngPoint
    *******************************************************************
    ******************************************************************/
    L.LatLngPointList = L.Class.extend({
        options: {
            isPolygon       : false,
            isRhumb         : false,
            pointConstructor: L.latLngPoint
        },

        /*****************************************************
        initialize
        *****************************************************/
        initialize: function( options ){
            options = options || [];
            L.setOptions(this, $.isArray(options) ? {list:options} : options );
            this.list = this.options.list || [];
            var _this = this;
            $.each( this.list, function(index, latLng){
                _this.list[index] = _this.options.pointConstructor( latLng, _this );
            });
            this.update();
        },

        /*****************************************************
        getDistance
        *****************************************************/
        getDistance: function(){
            return this.options.isRhumb ? this.totalRhumbDistance : this.totalDistance;
        },

        /*****************************************************
        update
        *****************************************************/
        update: function(){
            this.firstPoint = this.list.length ? this.list[0] : null;
            this.lastPoint = this.list.length ? this.list[this.list.length-1] : null;
            var _this = this;

            $.each( this.list, function(index, latLngPoint){
                latLngPoint.index = index;
                latLngPoint._update(
                    index ? _this.list[index-1] : null,
                    index == (_this.list.length-1) ? (_this.options.isPolygon ? _this.firstPoint : null) : _this.list[index+1]
                );
            });

            this.totalDistance      = this.lastPoint ? this.lastPoint.totalDistance      + (this.options.isPolygon ? this.lastPoint.next.distance      : 0) : 0;
            this.totalRhumbDistance = this.lastPoint ? this.lastPoint.totalRhumbDistance + (this.options.isPolygon ? this.lastPoint.next.rhumbDistance : 0) : 0;

            //Update totalDistanceToEnd and totalRhumbDistanceToEnd
            $.each( this.list, function(index, latLngPoint){
                latLngPoint.totalDistanceToEnd      = _this.totalDistance      - latLngPoint.totalDistance;
                latLngPoint.totalRhumbDistanceToEnd = _this.totalRhumbDistance - latLngPoint.totalRhumbDistance;
            });


            $.each( this.list, function(index, latLngPoint){
                latLngPoint.onUpdate( _this );
            });

            if (this.options.onUpdate)
                this.options.onUpdate( this );

        },

        /*****************************************************
        onUpdate
        *****************************************************/
        onUpdate: function(){},

        /*****************************************************
        append - Add a point to the end of the list
        *****************************************************/
        append: function( latLng, options ){
            return this.insert( latLng, undefined, options );
        },

        /*****************************************************
        insert - Insert a point after the point at list[index]
        *****************************************************/
        insert: function( latLng, index ){
            if (index == undefined)
                index = this.list.length-1;

            var newPoint = this.options.pointConstructor( latLng, this );
            this.list.splice(index+1, 0, newPoint );
            this.update();
            return newPoint;
        },

        /*****************************************************
        remove - Remove the latLngPoint at index
        *****************************************************/
        remove: function( index ){
            var latLngPoint = this.list[index];
            this.list.splice(index, 1);
            latLngPoint.onRemove();
            this.update();
        }
    });
    L.latLngPointList = function( options ){ return new L.LatLngPointList( options ); };

}(jQuery, L, this, document));



;
/****************************************************************************
leaflet-bootstrap-polyline.js

Extend L.Polyline with options to draw "shadow" and "interactive"-zone

****************************************************************************/
(function ($, L/*, window, document, undefined*/) {
    "use strict";
    var beforeAndAfter = function(methodName, method, reverseOrder) {
            method = method || L.Polyline.prototype[methodName];
            return function(){
                var firstLayerGroup = reverseOrder ? this.interactiveLayerGroup : this.shadowLayerGroup,
                    lastLayerGroup  = reverseOrder ? this.shadowLayerGroup : this.interactiveLayerGroup;

                if (firstLayerGroup)
                    firstLayerGroup[methodName].apply(firstLayerGroup, arguments);

                var result = method.apply(this, arguments);

                if (lastLayerGroup)
                    lastLayerGroup[methodName].apply(lastLayerGroup, arguments);
                return result;
            };
        };


    L.Polyline.include({
        /*****************************************************
        initialize
        *****************************************************/
        initialize: function( initialize ){
            return function( latLngs, options ){
                options = options || {};

                if (options.addInteractive)
                    options.interactive = true;

                initialize.call(this, latLngs, options );

                this.options = $.extend(true, {},
                    {
                        shadowStyle: {
                            width: 1,
                            color: 'white',
                            opacity: 0.5
                        },
/*
                        _interactiveStyle: {
                            width: 14,
                            color: 'yellow',
                            opacity: .5,
                        },
*/
                        interactiveStyle: {
                            width  : 4,
                            color  : 'transparent',
                            opacity: 1
                        },
                    },
                    this.options
                );

                function extendOptions( options, style, interactive ){
                    var result = $.extend({}, options);
                    return $.extend(result, {
                        weight : options.weight+2*style.width,
                        color  : style.color,
                        opacity: style.opacity,
                        addShadow: false,
                        addInteractive: false,
                        interactive: interactive,
                    });
                }

                if (this.options.addShadow){
                    this.shadowLayerGroup = L.layerGroup();
                    this.shadowPolyline = L.polyline(this.getLatLngs(), extendOptions(this.options, this.options.shadowStyle, false) );
                    this.shadowLayerGroup.addLayer(  this.shadowPolyline );
                }

                if (this.options.addInteractive){
                    this.interactiveLayerGroup = L.layerGroup();
                    this.interactivePolyline = L.polyline(this.getLatLngs(), extendOptions(this.options, this.options.interactiveStyle, true) );
                    this.interactiveLayerGroup.addLayer(  this.interactivePolyline );
                    this.on('add remove', this.setInteractiveOff, this );
                }
                return this;
            };
        }(L.Polyline.prototype.initialize),

        /*****************************************************
        onAdd - Add Polyline, shadow- and inertactive LayerGroup
        *****************************************************/
        onAdd: beforeAndAfter( 'addTo', L.Polyline.prototype.onAdd ),

        /*****************************************************
        Bind tooltip to interactivePolyline (if any)
        *****************************************************/
        bindTooltip: function(bindTooltip){
            return function(){
                bindTooltip.apply(this.interactivePolyline || this, arguments);
            };
        }(L.Polyline.prototype.bindTooltip),

        /*****************************************************
        If polyline has addInteractive => All mouse-evnets on polyline get caught
        by interactivePolyline and fired on this on clostes point
        *****************************************************/
        onMouseEventsOnInteractivePolyline: function( fn, context, mouseEvent ){
            //Adjust mouseEvent to closest latlng on this
            mouseEvent.latlng         = L.GeometryUtil.closest(this._map, this, mouseEvent.latlng);
            mouseEvent.layerPoint     = this._map.latLngToLayerPoint( mouseEvent.latlng );
            mouseEvent.containerPoint = this._map.latLngToContainerPoint( mouseEvent.latlng );

            fn.call(context || this, mouseEvent );
        },

        _on: function( _on ){
            return function(type, fn, context){
                if (this.interactivePolyline && (['click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'mousemove', 'contextmenu'].indexOf(type) != -1))
                    //Create a function to re-direct the event from this.interactivePolyline to this with latLng corrected to closest to this
                    return _on.call(
                        this.interactivePolyline,
                        type,
                        $.proxy(this.onMouseEventsOnInteractivePolyline, this, fn, context),
                        this
                    );
                else
                    return _on.apply(this, arguments );
            };
        }(L.Polyline.prototype._on),


        /*****************************************************
        onSetInteractive
        *****************************************************/
        onSetInteractive: function( /*on*/){
        },

        /*****************************************************
        setInteractive( on ) - set the polyline interactive on or off
        setInteractiveOn - - set the polyline interactive on
        setInteractiveOff - - set the polyline interactive off
        *****************************************************/
        setInteractive: function( on ){
            if (!this.interactivePolyline) return;
            this.isInteractive = !!on;
            if (on)
                this._map.addLayer(this.interactiveLayerGroup);
            else
                this._map.removeLayer(this.interactiveLayerGroup);

            //Toggle class "leaflet-interactive"
            $(this._path).toggleClass( "leaflet-interactive",  this.isInteractive);
            if (this.interactivePolyline)
                $(this.interactivePolyline._path).toggleClass( "leaflet-interactive",  this.isInteractive);

            this.onSetInteractive( this.isInteractive );
        },

        setInteractiveOn : function(){ this.setInteractive( true  ); },
        setInteractiveOff: function(){ this.setInteractive( false ); },

        /*****************************************************
        setLatLngs - also called for shadowPolyline and interactivePolyline
        *****************************************************/
        setLatLngs: function( setLatLngs ){
            return function(){
                setLatLngs.apply(this, arguments);
                if (this.shadowPolyline)
                    setLatLngs.apply(this.shadowPolyline, arguments);
                if (this.interactivePolyline)
                    setLatLngs.apply(this.interactivePolyline, arguments);
            };
        }(L.Polyline.prototype.setLatLngs ),

        /*****************************************************
        bringToFront, bringToBack, removeFrom:
        All called for shadowLayerGroup and interactiveLayerGroup
        *****************************************************/
        bringToFront: beforeAndAfter('bringToFront'),
        bringToBack : beforeAndAfter('bringToBack', null, true),
        removeFrom  : beforeAndAfter('removeFrom'),



    });

}(jQuery, L, this, document));


;
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
    var iconDim = 12,
        iconSize = [iconDim, iconDim];

    L.LatLngMarker = L.BsMarker.extend({
        options: {
            draggable: true,
            icon     : L.divIcon({
                           iconSize : iconSize,
                           className: 'lbm-icon lbm-draw'
                       }),
            tooltip  : {
                da:'Træk for at ændre, klik for at fjerne',
                en:'Drag to change, click to remove'
            }
        }
    });

    L.LatLngEditMarker = L.LatLngMarker.extend({
        options: {
            icon   : L.divIcon({
                         iconSize : iconSize,
                         className: 'lbm-icon lbm-draw hide-on-leaflet-dragging lbm-warning'
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
            this.marker.on('dragend',   this.onDragend,   this);
            this.marker.on('click',     this.remove,      this );

        },

        /*****************************************************
        onDragstart
        *****************************************************/
        onDragstart: function(/*mouseEvent*/){
            this.latLngPointlist.currentLatLngPoint = this;
            this.onDragEvent('dragstart');
        },

        /*****************************************************
        onDrag
        *****************************************************/
        onDrag: function(mouseEvent){
            this.lat  = mouseEvent.latlng.lat;
            this.lng = mouseEvent.latlng.lng;
            this.update();
        },

        /*****************************************************
        onDragend
        *****************************************************/
        onDragend: function(/*mouseEvent*/){
            this.latLngPointlist.currentLatLngPoint = null;
            this.onDragEvent('dragend');
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




;
/****************************************************************************
leaflet-marker-vessel

Based on leaflet.boatmarker v1.1.0 by Thomas Brüggemann

Each vessel is defined in a coordinat system with x:[-100, 100] y: [-100, 100]
The vessel is defined as going from bottom to top
****************************************************************************/
(function ($, L, window, document, undefined) {
    "use strict";

    var defaultOptions = {
            draggable: false,
            dim      : 30,
            shape    : 'airplane',
            color    : '#8ED6FF'
        };

/*
    //adjustShape - Used to mirror a shape
    function adjustShape( shape ){
        for (var i=shape.length-1; i>=0; i-- ){
            var point = shape[i].slice();
            point[0] = -point[0];
            if (point.length == 4)
                point[2] = -point[2];
            shape.push( point );
        }
    }
*/
    //The different shapes. Each point = normal:[x, y] or quadraticCurveTo:[x,y, qcx, qcy], or bezierCurveTo:[x,y, cp1x, cp1y, cp2x, cp2y]
    var shapes = {};

    //Airplane
    shapes['airplane'] = [
        [  0,  160],
        [  80, 180],
        [  80, 130],
        [  40, 100],
        [  40,  60],
        [ 160, 110],
        [ 160,  40],
        [  40, -30],
        [  40,-100],
        [   0, -160,  20, -160],
        [ -40, -100, -20, -160],
        [ -40, -30],
        [-160,  40],
        [-160, 110],
        [ -40,  60],
        [ -40, 100],
        [ -80, 130],
        [ -80, 180],
        [   0, 160]
    ];

    //Pleasure boat - adopted from leaflet.boatmarker
    var x = -70, y=100, b=1.4;
    shapes['boat'] = [
        [x, y],
        [x+100*b, y, x, y+80*b, x+100*b, y+80*b],
        [x+50*b, y-200*b, x+100*b, y-100*b],
        [x, y, x, y-100*b]
    ];


    //Ship - TODO
    shapes['ship'] = [

    ];

    /*****************************************************
    L.VesselIcon
    *****************************************************/
    L.VesselIcon = L.Icon.extend({
        options: {
            className: "leaflet-vessel-icon",
            course   : 0
        },

        /*****************************************************
        createIcon - setup the icon and start drawing
        *****************************************************/
        createIcon: function () {
            var elem = document.createElement("canvas");
            this._setIconStyles(elem, "icon");

            elem.width  = this.options.iconSize.x;
            elem.height = this.options.iconSize.y;

            this.setShape( this.options.shape );

            this.ctx = elem.getContext("2d");
            this.draw();

            return elem;
        },

        /**********************************************************
        setColor - Set new colro
        **********************************************************/
        setColor: function(color) {
            this.options.color = color;
            this.draw();
        },

        /**********************************************************
        setShape - Select and adjust a new shape
        **********************************************************/
        setShape: function(shape) {
            this.options.shape = shape;

            /*
            The icon is 1.5 x the size of the drawing.
            All drawings are given in a coordinat system [-100, 100]x[-100, 100]
            offset and factor are set to convert from [-100, 100]x[-100, 100] to canvas coordinates
            */
            var _this = this,
                shapeDim = this.options.dim,
                margin = shapeDim*0.5/2,
                offset = 100,
                factor = (shapeDim-2*margin)/(2*offset);

            function trans( rel ){
                return rel == undefined ? null : margin + (rel + offset)*factor;
            }

            this.shapePoints = [];
            $.each(shapes[this.options.shape], function( index, xy ){
                _this.shapePoints.push({
                    x   : trans(xy[0]),
                    y   : trans(xy[1]),
                    qcx : trans(xy[2]),
                    qcy : trans(xy[3]),
                    cp1x: trans(xy[2]),
                    cp1y: trans(xy[3]),
                    cp2x: trans(xy[4]),
                    cp2y: trans(xy[5])

                });
            });
        },

        /**********************************************************
        draw - renders the vessel icon onto the canvas element
        **********************************************************/
        draw: function() {
            if(!this.ctx) return;

            var ctx = this.ctx,
                shape = this.shapePoints,
                shapeDim = this.options.dim;

            ctx.clearRect(0, 0, shapeDim, shapeDim);
/*Only test:
ctx.fillStyle = '#999999';
ctx.fillRect(0, 0, shapeDim, shapeDim);
*/
            ctx.translate(shapeDim/2, shapeDim/2);

            var rotate = this.options.rotate ? -this.options.rotate : 0;
            this.options.rotate = this.options.course*Math.PI/180;
            ctx.rotate(rotate + this.options.rotate);
            ctx.translate(-shapeDim/2, -shapeDim/2);

            ctx.beginPath();
            ctx.moveTo(shape[0].x, shape[0].y );

            $.each( shape, function(index, pos){
                if (pos.qcx == null)
                    ctx.lineTo(pos.x, pos.y);
                else
                    if (pos.cp2x == null)
                        ctx.quadraticCurveTo(pos.qcx, pos.qcy, pos.x, pos.y);
                    else
                        ctx.bezierCurveTo(pos.cp1x, pos.cp1y, pos.cp2x, pos.cp2y, pos.x, pos.y);
            });

            ctx.strokeStyle = "#000000";
            ctx.fillStyle   = this.options.color;
            ctx.lineJoin    = 'round';

            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        },

        /**********************************************************
        setHeading - sets the vessel heading and update the vessel icon accordingly
        **********************************************************/
        setHeading: function(heading) {
            this.options.course = (heading % 360);
            this.draw();
        }
    });

    /*****************************************************
    L.VesselMarker
    *****************************************************/
    L.VesselMarker = L.Marker.extend({
        initialize: function(latLng, options){
            options = $.extend({}, defaultOptions, options);
            options.icon =  new L.VesselIcon({
                                    shape   : options.shape,
                                    color   : options.color,
                                    dim     : options.dim,
                                    iconSize: new L.Point(options.dim, options.dim)
                                });
            L.Marker.prototype.initialize.call(this, latLng, options);
        },

        onAdd: function(){
            this.options.icon.options.rotate = 0;
            return L.Marker.prototype.onAdd.apply( this, arguments );
        },

        setHeading: function(heading) { this.options.icon.setHeading(heading);  },
        setShape  : function(shape)   { this.options.icon.setShape(shape);      },
        setColor  : function(color)   { this.options.icon.setColor(color);      }
    });

    L.vesselMarker = function(latLng, options) {
        return new L.VesselMarker(latLng, options);
    };

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
            VERSION: "0.1.2"

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



