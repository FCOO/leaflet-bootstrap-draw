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


