var math = require('../math'),
    EventEmitter = require('eventemitter3'),
    Transform = require('./Transform'),
    _tempDisplayObjectParent = {worldTransform:new math.Matrix(), worldAlpha:1, children:[]};

var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * The base class for all objects that are rendered on the screen.
 * This is an abstract class and should not be used on its own rather it should be extended.
 *
 * @class
 * @extends EventEmitter
 * @memberof PIXI
 */
function DisplayObject()
{
    EventEmitter.call(this);

    //TODO: need to create Transform from factory
    /**
     * World transform and local transform of this object.
     * This will be reworked in v4.1, please do not use it yet unless you know what are you doing!
     */
    this.transform = new Transform();

    /**
     * The opacity of the object.
     *
     * @member {number}
     */
    this.alpha = 1;

    /**
     * The visibility of the object. If false the object will not be drawn, and
     * the updateTransform function will not be called.
     *
     * @member {boolean}
     */
    this.visible = true;

    /**
     * Can this object be rendered, if false the object will not be drawn but the updateTransform
     * methods will still be called.
     *
     * @member {boolean}
     */
    this.renderable = true;

    /**
     * The display object container that contains this display object.
     *
     * @member {PIXI.Container}
     * @readOnly
     */
    this.parent = null;

    /**
     * The multiplied alpha of the displayObject
     *
     * @member {number}
     * @readOnly
     */
    this.worldAlpha = 1;

    /**
     * The area the filter is applied to. This is used as more of an optimisation
     * rather than figuring out the dimensions of the displayObject each frame you can set this rectangle
     *
     * Also works as an interaction mask
     *
     * @member {PIXI.Rectangle}
     */
    this.filterArea = null;

    /**
     * Interaction shape. Children will be hit first, then this shape will be checked.
     *
     * @member {PIXI.Rectangle|PIXI.Circle|PIXI.Ellipse|PIXI.Polygon|PIXI.RoundedRectangle}
     */
    this.hitArea = null;

    /**
     * The original, cached bounds of the object
     *
     * @member {PIXI.Rectangle}
     * @private
     */
    this._bounds = new math.Rectangle(0, 0, 1, 1);

    /**
     * The most up-to-date bounds of the object
     *
     * @member {PIXI.Rectangle}
     * @private
     */
    this._currentBounds = null;

    /**
     * The original, cached mask of the object
     *
     * @member {PIXI.Rectangle}
     * @private
     */
    this._mask = null;

    /**
     * 是否允许获取bounds
     * @type {boolean}
     */
    this.allowGetBounds = true;
}

// constructor
DisplayObject.prototype = Object.create(EventEmitter.prototype);
DisplayObject.prototype.constructor = DisplayObject;
module.exports = DisplayObject;


Object.defineProperties(DisplayObject.prototype, {
    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     *
     * @member {number}
     * @memberof PIXI.DisplayObject#
     */
    x: {
        get: function ()
        {
            return this.position.x;
        },
        set: function (value)
        {
            this.transform.position.x = value;
        }
    },

    /**
     * The position of the displayObject on the y axis relative to the local coordinates of the parent.
     *
     * @member {number}
     * @memberof PIXI.DisplayObject#
     */
    y: {
        get: function ()
        {
            return this.position.y;
        },
        set: function (value)
        {
            this.transform.position.y = value;
        }
    },

    /**
     * Current transform of the object based on world (parent) factors
     *
     * @member {PIXI.Matrix}
     * @readOnly
     */
    worldTransform: {
        get: function ()
        {
            return this.transform.worldTransform;
        }
    },

    /**
     * Current transform of the object based on local factors: position, scale, other stuff
     *
     * @member {PIXI.Matrix}
     * @readOnly
     */
    localTransform: {
        get: function ()
        {
            return this.transform.localTransform;
        }
    },

    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     *
     * @member {PIXI.Point}
     */
    position: {
        get: function()
        {
            return this.transform.position;
        },
        set: function(value) {
            this.transform.position = value;
        }
    },

    /**
     * The scale factor of the object.
     *
     * @member {PIXI.Point}
     */
    scale: {
        get: function() {
            return this.transform.scale;
        },
        set: function(value) {
            this.transform.scale = value;
        }
    },

    /**
     * The pivot point of the displayObject that it rotates around
     *
     * @member {PIXI.Point}
     */
    pivot: {
        get: function() {
            return this.transform.pivot;
        },
        set: function(value) {
            this.transform.pivot = value;
        }
    },

    /**
     * The skew factor for the object in radians.
     *
     * @member {PIXI.Point}
     */
    skew: {
        get: function() {
            return this.transform.skew;
        },
        set: function(value) {
            this.transform.skew = value;
        }
    },

    /**
     * The rotation of the object in radians.
     *
     * @member {number}
     */
    rotation: {
        get: function ()
        {
            return this.transform.rotation;
        },
        set: function (value)
        {
            this.transform.rotation = value;
        }
    },

    /**
     * Indicates if the sprite is globally visible.
     *
     * @member {boolean}
     * @memberof PIXI.DisplayObject#
     * @readonly
     */
    worldVisible: {
        get: function ()
        {
            var item = this;

            do {
                if (!item.visible)
                {
                    return false;
                }

                item = item.parent;
            } while (item);

            return true;
        }
    },

    /**
     * Sets a mask for the displayObject. A mask is an object that limits the visibility of an object to the shape of the mask applied to it.
     * In PIXI a regular mask must be a PIXI.Graphics or a PIXI.Sprite object. This allows for much faster masking in canvas as it utilises shape clipping.
     * To remove a mask, set this property to null.
     *
     * @todo For the moment, PIXI.CanvasRenderer doesn't support PIXI.Sprite as mask.
     *
     * @member {PIXI.Graphics|PIXI.Sprite}
     * @memberof PIXI.DisplayObject#
     */
    mask: {
        get: function ()
        {
            return this._mask;
        },
        set: function (value)
        {
            if (this._mask)
            {
                this._mask.renderable = true;
            }

            this._mask = value;

            if (this._mask)
            {
                this._mask.renderable = false;
            }
        }
    },

    /**
     * Sets the filters for the displayObject.
     * * IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
     * To remove filters simply set this property to 'null'
     *
     * @member {PIXI.AbstractFilter[]}
     * @memberof PIXI.DisplayObject#
     */
    filters: {
        get: function ()
        {
            return this._filters && this._filters.slice();
        },
        set: function (value)
        {
            this._filters = value && value.slice();
        }
    }

});

/*
 * Updates the object transform for rendering
 *
 * TODO - Optimization pass!
 */
DisplayObject.prototype.updateTransform = function ()
{
    if (this.parent.transform) {
        this.transform =  this.parent.transform.updateChildTransform(this.transform);
        // multiply the alphas..
        this.worldAlpha = this.alpha * this.parent.worldAlpha;
    }
};

// performance increase to avoid using call.. (10x faster)
DisplayObject.prototype.displayObjectUpdateTransform = DisplayObject.prototype.updateTransform;

/**
 * 添加一个事件监听器
 */
DisplayObject.prototype.addEventListener = function() {
    this.interactive = true;
    this.on.apply(this, arguments);
}

/**
 * 发送消息
 */
DisplayObject.prototype.dispatchEvent = function() {
    this.emit.apply(this, arguments);
}

/**
 *
 *
 * Retrieves the bounds of the displayObject as a rectangle object
 *
 * @param matrix {PIXI.Matrix}
 * @return {PIXI.Rectangle} the rectangular bounding area
 */
DisplayObject.prototype.getBounds = function (matrix) // jshint unused:false
{
    return math.Rectangle.EMPTY;
};

/**
 * 获取根节点
 */
Object.defineProperty(DisplayObject.prototype, 'root', {
    get : function() {
        if (this._root_ === undefined) {
            var _root = this;
            while (true) {
                if (_root.parent === null) {
                    this._root_ = _root;
                    break;
                }
                _root = _root.parent;
            }
        }
        return this._root_;
    },

    set : function(value) {
        this._root_ = value;
    }
});

/**
 * 获取当前容器所在的BaseEquipment容器
 */
Object.defineProperty(DisplayObject.prototype, 'currentEquipment', {
    get : function() {
        if (this._currentEq_ === undefined) {
            if (window.chemical === undefined) {
                return undefined;
            }
            var eq = this;
            while (eq) {
                if (eq instanceof chemical.core.BaseEquipment) {
                    this._currentEq_ = eq;
                    return eq;
                }
                eq = eq.parent;
            }
        }
        return this._currentEq_;
    },
    set : function(c) {
        this._currentEq_ = c;
    }
});

/**
 * Hit test
 * @param dis {PIXI.DisplayObject}
 * @return {boolean}
 */
DisplayObject.prototype.hitTest = function(dis) {
    /*
    var rect1 = this.getBounds();
    var rect2 = dis.getBounds();
    //get the maximum x,y between rect1 and rect2.
    var x = Math.max(rect1.x, rect2.x);
    var y = Math.max(rect1.y, rect2.y);
    //calculateing width and height of intersection area.
    var w = Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - x;
    var h = Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - y;
    if (h <= 0 || w <= 0) {
        return false;
    }
    return true;
    */
    var conf = this;
    var localBoundsA = this.getLocalBounds().clone();
    var localBoundsB = dis.getLocalBounds().clone();
    this.updateTransform();
    dis.updateTransform();
    var rect1 = this.getBounds();
    var rect2 = dis.getBounds();
    var globalA = this.toGlobal({x:localBoundsA.x, y:localBoundsA.y})//{x:this.toGlobal({x:0, y:0}).x + localBoundsA.x, y:this.toGlobal({x:0, y:0}).y + localBoundsA.y};
    var globalB = dis.toGlobal({x:localBoundsB.x, y:localBoundsB.y})//{x:dis.toGlobal({x:0, y:0}).x + localBoundsB.x, y:dis.toGlobal({x:0, y:0}).y + localBoundsB.y};

    //console.log(rectPoint(this, rect1, localBoundsA), rectPoint(dis, rect2, localBoundsB))
    //找到最外层的旋转角度
    function findRotate (a) {
        var r = 0;
        function viewStack (a) {
            if(a.viewStack) {
                r = a.rotation;
            }else{
                viewStack(a.parent)
            }
        }
        viewStack (a)
        return r;
    }

    //矩形的四个顶点
    function rectPoint (target, global, bounds) {
        var rotateA = findRotate(target);

        var _x1 = global.x + Math.cos(rotateA) * bounds.width;
        var _y1 = global.y + Math.sin(rotateA) * bounds.width;

        var _x3 = global.x - Math.sin(rotateA) * bounds.height;
        var _y3 = global.y + Math.cos(rotateA) * bounds.height;

        var _x2 = bounds.width * Math.cos(rotateA) - bounds.height * Math.sin(rotateA) + global.x;
        var _y2 = bounds.width * Math.sin(rotateA) + bounds.height * Math.cos(rotateA) + global.y;

        return [{x:global.x, y:global.y}, {x:_x1, y:_y1}, {x:_x2, y:_y2}, {x:_x3, y:_y3}]
    }

    //求交点
    function intersectPoint (a, b, c, d) {
        /** 1 解线性方程组, 求线段交点. **/
            // 如果分母为0 则平行或共线, 不相交
        var denominator = (b.y - a.y)*(d.x - c.x) - (a.x - b.x)*(c.y - d.y);
        if (denominator==0) {
            return false;
        }

        // 线段所在直线的交点坐标 (x , y)
        var x = ( (b.x - a.x) * (d.x - c.x) * (c.y - a.y) + (b.y - a.y) * (d.x - c.x) * a.x - (d.y - c.y) * (b.x - a.x) * c.x ) / denominator ;
        var y = -( (b.y - a.y) * (d.y - c.y) * (c.x - a.x) + (b.x - a.x) * (d.y - c.y) * a.y - (d.x - c.x) * (b.y - a.y) * c.y ) / denominator;

        /** 2 判断交点是否在两条线段上 **/
        if (// 交点在线段1上
        (x - a.x) * (x - b.x) <= 0 && (y - a.y) * (y - b.y) <= 0
        // 且交点也在线段2上
        && (x - c.x) * (x - d.x) <= 0 && (y - c.y) * (y - d.y) <= 0
        ){
            // 返回交点p
            return {
                x : x,
                y : y
            }
        }
        //否则不相交
        return false
    }
    //var pointAry = [];
    //
    //dragline()
    //function dragline () {
    //    var arr0 = rectPoint(conf, globalA, localBoundsA);
    //    var arr1 = rectPoint(dis, globalB, localBoundsB);
    //
    //    for(var i = 0 ; i < 4; i ++) {
    //        var g = new PIXI.Graphics();
    //        g.beginFill(0x0, 1)
    //        g.drawCircle(arr1[i].x, arr1[i].y, 5);
    //        g.drawCircle(arr0[i].x, arr0[i].y, 5);
    //        pointAry.push(g);
    //        conf.viewStack.addChild(g);
    //    }
    //}

    //判断是否相交
    function check () {
        var arr0 = rectPoint(conf, globalA, localBoundsA);
        var arr1 = rectPoint(dis, globalB, localBoundsB);
        for(var i = 0 ; i < arr0.length ; i++) {
            var a0 = arr0[i];
            var a1 = arr0[(i + 1) % arr0.length];
            for(var j = 0 ; j < arr1.length ; j ++) {
                var b0 = arr1[j];
                var b1 = arr1[(j + 1) % arr1.length];
                if(intersectPoint (a0, a1, b0, b1)) {
                    //throw intersectPoint (a0, a1, b0, b1)
                    console.log('找到了一个焦点' +
                        intersectPoint (a0, a1, b0, b1))
                    return true;
                }
            }

        }
        for(var i = 0 ; i < arr0.length; i ++) {
            if(containsPoint(arr1, arr0[i])) {
                console.log('点在矩形的内部')
                return true;
            }
        }
        return false;
    }

    //点在矩形内
    function containsPoint (vs, p) {
        var x = p.x;
        var y = p.y;
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i].x, yi = vs[i].y;
            var xj = vs[j].x, yj = vs[j].y;

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    return check ()
}

/**
 * Hit test point
 * @param p
 * @returns {boolean}
 */
DisplayObject.prototype.hitTestPoint = function(p) {
    var g = this.getBounds();
    return g.contains(p.x, p.y);
}

/**
 * Retrieves the local bounds of the displayObject as a rectangle object
 *
 * @return {PIXI.Rectangle} the rectangular bounding area
 */
DisplayObject.prototype.getLocalBounds = function ()
{
    return this.getBounds(math.Matrix.IDENTITY);
};

/**
 * Calculates the global position of the display object
 *
 * @param position {PIXI.Point} The world origin to calculate from
 * @return {PIXI.Point} A point object representing the position of this object
 */
DisplayObject.prototype.toGlobal = function (position)
{
    // this parent check is for just in case the item is a root object.
    // If it is we need to give it a temporary parent so that displayObjectUpdateTransform works correctly
    // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
    if(!this.parent)
    {
        this.parent = _tempDisplayObjectParent;
        this.displayObjectUpdateTransform();
        this.parent = null;
    }
    else
    {
        this.displayObjectUpdateTransform();
    }

    // don't need to update the lot
    return this.worldTransform.apply(position);
};

/**
 * Calculates the local position of the display object relative to another point
 *
 * @param position {PIXI.Point} The world origin to calculate from
 * @param [from] {PIXI.DisplayObject} The DisplayObject to calculate the global position from
 * @param [point] {PIXI.Point} A Point object in which to store the value, optional (otherwise will create a new Point)
 * @return {PIXI.Point} A point object representing the position of this object
 */
DisplayObject.prototype.toLocal = function (position, from, point)
{
    if (from)
    {
        position = from.toGlobal(position);
    }

    // this parent check is for just in case the item is a root object.
    // If it is we need to give it a temporary parent so that displayObjectUpdateTransform works correctly
    // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
    if(!this.parent)
    {
        this.parent = _tempDisplayObjectParent;
        this.displayObjectUpdateTransform();
        this.parent = null;
    }
    else
    {
        this.displayObjectUpdateTransform();
    }

    // simply apply the matrix..
    return this.worldTransform.applyInverse(position, point);
};

/**
 * Renders the object using the WebGL renderer
 *
 * @param renderer {PIXI.WebGLRenderer} The renderer
 * @private
 */
DisplayObject.prototype.renderWebGL = function (renderer) // jshint unused:false
{
    // OVERWRITE;
};

/**
 * Renders the object using the Canvas renderer
 *
 * @param renderer {PIXI.CanvasRenderer} The renderer
 * @private
 */
DisplayObject.prototype.renderCanvas = function (renderer) // jshint unused:false
{
    // OVERWRITE;
};

/**
 * Set the parent Container of this DisplayObject
 *
 * @param container {Container} The Container to add this DisplayObject to
 * @return {Container} The Container that this DisplayObject was added to
 */
DisplayObject.prototype.setParent = function (container)
{
    if (!container || !container.addChild)
    {
        throw new Error('setParent: Argument must be a Container');
    }

    container.addChild(this);
    return container;
};

/**
 * Convenience function to set the postion, scale, skew and pivot at once.
 *
 * @param [x=0] {number} The X position
 * @param [y=0] {number} The Y position
 * @param [scaleX=1] {number} The X scale value
 * @param [scaleY=1] {number} The Y scale value
 * @param [rotation=0] {number} The rotation
 * @param [skewX=0] {number} The X skew value
 * @param [skewY=0] {number} The Y skew value
 * @param [pivotX=0] {number} The X pivot value
 * @param [pivotY=0] {number} The Y pivot value
 * @return {PIXI.DisplayObject}
 */
DisplayObject.prototype.setTransform = function(x, y, scaleX, scaleY, rotation, skewX, skewY, pivotX, pivotY) //jshint ignore:line
{
    this.position.x = x || 0;
    this.position.y = y || 0;
    this.scale.x = !scaleX ? 1 : scaleX;
    this.scale.y = !scaleY ? 1 : scaleY;
    this.rotation = rotation || 0;
    this.skew.x = skewX || 0;
    this.skew.y = skewY || 0;
    this.pivot.x = pivotX || 0;
    this.pivot.y = pivotY || 0;
    return this;
};

/**
 * Base destroy method for generic display objects
 *
 */
DisplayObject.prototype.destroy = function ()
{

    this.position = null;
    this.scale = null;
    this.pivot = null;
    this.skew = null;

    this.parent = null;

    this._bounds = null;
    this._currentBounds = null;
    this._mask = null;

    this.worldTransform = null;
    this.filterArea = null;
};

/**
 * 是否有eventType方法
 * @param eventType 事件类型
 */
DisplayObject.prototype.has = EventEmitter.prototype.hasEventListener = function(eventType) {
    var evt = prefix ? prefix + eventType : eventType;
    if (!this._events || !this._events[evt]) {
        return false;
    }
    return true;
}

function EE(fn, context, once) {
    this.fn = fn;
    this.context = context;
    this.once = once || false;
    // 默认不使用冒泡
    this.bubble = false;
    // 默认捕获为false
    this.capture = false;
}

// 重写emit方法
DisplayObject.prototype.emit = function(event, a1, a2, a3, a4, a5) {
    var evt = prefix ? prefix + event : event;

    // 设置a1的默认值
    if (a1 && a1.capture === undefined) {
        a1.capture = false;
    }

    if (!this._events || !this._events[evt]) return false;

    var listeners = this._events[evt]
        , len = arguments.length
        , args
        , i;

    if ('function' === typeof listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

        /*
        switch (len) {
            case 1: return listeners.fn.call(listeners.context), true;
            case 2: return listeners.fn.call(listeners.context, a1), true;
            case 3: return listeners.fn.call(listeners.context, a1, a2), true;
            case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
            case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
            case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        */
        if (a1 !== undefined) {
            for (i = 1, args = []; i < len; i++) {
                args[i - 1] = arguments[i];
            }
            if (listeners.capture === a1.capture || a1.capture === undefined) {
                listeners.fn.apply(listeners.context, args);
            }
        } else {
            listeners.fn.call(listeners.context);
        }
    } else {
        var length = listeners.length
            , j;

        for (i = 0; i < length; i++) {
            if (listeners[i].once) {
                this.removeListener(event, listeners[i].fn, undefined, true);
            }
            if (a1 && a1.stopImmediate === true) {
                break;
            }
            if (a1 !== undefined) {
                for (j = 1, args = []; j < len; j++) {
                    args[j - 1] = arguments[j];
                }
                if (listeners[i].capture === a1.capture || a1.capture === undefined) {
                    listeners[i].fn.apply(listeners[i].context, args);
                }
            } else {
                listeners[i].fn.apply(listeners[i].context);
            }
        }
    }

    return true;
}

DisplayObject.prototype.once = function once(event, fn, context) {
    var listener = new EE(fn, context || this, true)
        , evt = prefix ? prefix + event : event;

    if (!this._events) this._events = prefix ? {} : Object.create(null);
    if (!this._events[evt]) this._events[evt] = listener;
    else {
        if (!this._events[evt].fn) this._events[evt].push(listener);
        else this._events[evt] = [
            this._events[evt], listener
        ];
    }

    return this;
};

//准备覆盖方法on
DisplayObject.prototype.$on = function on(event, fn, capture, priority) {
    var listener = new EE(fn, this)
        , evt = prefix ? prefix + event : event;
    if (capture === undefined) {
        capture = false;
    }
    listener.capture = capture;
    listener.priority = priority || 0;

    if (!this._events) {
        this._events = prefix ? {} : Object.create(null);
    }
    if (!this._events[evt]) {
        this._events[evt] = listener;
    } else {
        var eventAry = this._events[evt];
        if (!eventAry.fn) {
            for (var i = 0; i < eventAry.length; i ++) {
                var e = eventAry[i];
                if (e.fn === fn) {
                    break;
                }
            }
            if (i === eventAry.length) {
                eventAry.push(listener);
            }
        } else {
            if (eventAry.fn !== listener.fn) {
                eventAry = [
                    eventAry, listener
                ];
                this._events[evt] = eventAry;
            }
        }
        if (eventAry instanceof Array) {
            eventAry.sort(function(a, b) {
                return b.priority - a.priority;
            });
        }
    }

    return this;
};


DisplayObject.prototype.on = function on(event, fn, capture, priority) {
    if (event === TouchEvent.TOUCH_BEGIN) {
        this.$on('mousedown', fn, capture, priority);
        this.$on('touchstart', fn, capture, priority);
        return this;
    } else if (event === TouchEvent.TOUCH_MOVE) {
        this.$on('mousemove', fn, capture, priority);
        this.$on('touchmove', fn, capture, priority);
        return this;
    } else if (event === TouchEvent.TOUCH_END) {
        this.$on('mouseup', fn, capture, priority);
        this.$on('touchend', fn, capture, priority);
        return this;
    } else if (event === TouchEvent.TAP) {
        this.$on('click', fn, capture, priority);
        this.$on('tap', fn, capture, priority);
        return this;
    } else if (event === TouchEvent.TOUCH_END_OUDSIDE) {
        this.$on('mouseupoutside', fn, capture, priority);
        this.$on('touchendoutside', fn, capture, priority);
        return this;
    }
    this.$on(event, fn, capture, priority);
}

DisplayObject.prototype.$removeListener = function(event, fn, capture, once) {
    var evt = prefix ? prefix + event : event;
    if (!this._events || !this._events[evt]) return this;
    var listeners = this._events[evt]
        , events = [];

    if (fn) {
        if (listeners.fn) {
            if (
                listeners.fn !== fn
                || (once && !listeners.once)
                || (!listeners.capture === capture)
            ) {
                events.push(listeners);
            }
        } else {
            for (var i = 0, length = listeners.length; i < length; i++) {
                if (
                    listeners[i].fn !== fn
                    || (once && !listeners[i].once)
                    || (!listeners[i].capture === capture)
                ) {
                    events.push(listeners[i]);
                }
            }
        }
    } else {
        //添加return，避免全部被删除
        return;
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) {
        this._events[evt] = events.length === 1 ? events[0] : events;
    } else {
        delete this._events[evt];
    }

    return this;
}

DisplayObject.prototype.removeEventListener = DisplayObject.prototype.removeListener = function removeListener(event, fn, context, once) {
    if (event === TouchEvent.TOUCH_BEGIN) {
        this.$removeListener('mousedown', fn, context, once);
        this.$removeListener('touchstart', fn, context, once);
        return;
    } else if (event === TouchEvent.TOUCH_MOVE) {
        this.$removeListener('mousemove', fn, context, once);
        this.$removeListener('touchmove', fn, context, once);
        return;
    } else if (event === TouchEvent.TOUCH_END) {
        this.$removeListener('mouseup', fn, context, once);
        this.$removeListener('touchend', fn, context, once);
        return;
    } else if (event === TouchEvent.TAP) {
        this.$removeListener('click', fn, context, once);
        this.$removeListener('tap', fn, context, once);
        return;
    } else if (event === TouchEvent.TOUCH_END_OUDSIDE) {
        this.$removeListener('mouseupoutside', fn, context, once);
        this.$removeListener('touchendoutside', fn, context, once);
        return;
    }
    this.$removeListener(event, fn, context, once);
}


