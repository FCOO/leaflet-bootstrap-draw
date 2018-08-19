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
