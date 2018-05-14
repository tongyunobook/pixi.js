import EventEmitter from 'eventemitter3';
import { TRANSFORM_MODE } from '../const';
import settings from '../settings';
import TransformStatic from './TransformStatic';
import Transform from './Transform';
import Bounds from './Bounds';
import { Rectangle } from '../math';

let prefix = '';
// _tempDisplayObjectParent = new DisplayObject();

/**
 * The base class for all objects that are rendered on the screen.
 * This is an abstract class and should not be used on its own rather it should be extended.
 *
 * @class
 * @extends EventEmitter
 * @memberof PIXI
 */
export default class DisplayObject extends EventEmitter
{
    /**
     *
     */
    constructor()
    {
        super();

        const TransformClass = settings.TRANSFORM_MODE === TRANSFORM_MODE.STATIC ? TransformStatic : Transform;

        this.tempDisplayObjectParent = null;

        // TODO: need to create Transform from factory
        /**
         * World transform and local transform of this object.
         * This will become read-only later, please do not assign anything there unless you know what are you doing
         *
         * @member {PIXI.TransformBase}
         */
        this.transform = new TransformClass();

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
         * Only affects recursive calls from parent. You can ask for bounds or call updateTransform manually
         *
         * @member {boolean}
         */
        this.visible = true;

        /**
         * Can this object be rendered, if false the object will not be drawn but the updateTransform
         * methods will still be called.
         *
         * Only affects recursive calls from parent. You can ask for bounds manually
         *
         * @member {boolean}
         */
        this.renderable = true;

        /**
         * The display object container that contains this display object.
         *
         * @member {PIXI.Container}
         * @readonly
         */
        this.parent = null;

        /**
         * The multiplied alpha of the displayObject
         *
         * @member {number}
         * @readonly
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

        this._filters = null;
        this._enabledFilters = null;

        /**
         * The bounds object, this is used to calculate and store the bounds of the displayObject
         *
         * @member {PIXI.Rectangle}
         * @private
         */
        this._bounds = new Bounds();
        this._boundsID = 0;
        this._lastBoundsID = -1;
        this._boundsRect = null;
        this._localBoundsRect = null;

        /**
         * The original, cached mask of the object
         *
         * @member {PIXI.Graphics|PIXI.Sprite}
         * @private
         */
        this._mask = null;

        /**
         * If the object has been destroyed via destroy(). If true, it should not be used.
         *
         * @member {boolean}
         * @private
         * @readonly
         */
        this._destroyed = false;

        /**
         * Fired when this DisplayObject is added to a Container.
         *
         * @event PIXI.DisplayObject#added
         * @param {PIXI.Container} container - The container added to.
         */

        /**
         * Fired when this DisplayObject is removed from a Container.
         *
         * @event PIXI.DisplayObject#removed
         * @param {PIXI.Container} container - The container removed from.
         */


        /**
         * 是否允许获取bounds
         * @type {boolean}
         */
        this.allowGetBounds = true;
    }

    /**
     * @private
     * @member {PIXI.DisplayObject}
     */
    get _tempDisplayObjectParent()
    {
        if (this.tempDisplayObjectParent === null)
        {
            this.tempDisplayObjectParent = new DisplayObject();
        }

        return this.tempDisplayObjectParent;
    }

    /**
     * Updates the object transform for rendering
     *
     * TODO - Optimization pass!
     */
    updateTransform()
    {
        this.transform.updateTransform(this.parent.transform);
        // multiply the alphas..
        this.worldAlpha = this.alpha * this.parent.worldAlpha;

        this._bounds.updateID++;
    }

    /**
     * recursively updates transform of all objects from the root to this one
     * internal function for toLocal()
     */
    _recursivePostUpdateTransform()
    {
        if (this.parent)
        {
            this.parent._recursivePostUpdateTransform();
            this.transform.updateTransform(this.parent.transform);
        }
        else
        {
            this.transform.updateTransform(this._tempDisplayObjectParent.transform);
        }
    }

    /**
     * Retrieves the bounds of the displayObject as a rectangle object.
     *
     * @param {boolean} skipUpdate - setting to true will stop the transforms of the scene graph from
     *  being updated. This means the calculation returned MAY be out of date BUT will give you a
     *  nice performance boost
     * @param {PIXI.Rectangle} rect - Optional rectangle to store the result of the bounds calculation
     * @return {PIXI.Rectangle} the rectangular bounding area
     */
    getBounds(skipUpdate, rect)
    {
        if (this.allowGetBounds === false) {
            return Rectangle.EMPTY;
        }
        if (!skipUpdate)
        {
            if (!this.parent)
            {
                this.parent = this._tempDisplayObjectParent;
                this.updateTransform();
                this.parent = null;
            }
            else
            {
                this._recursivePostUpdateTransform();
                this.updateTransform();
            }
        }

        if (this._boundsID !== this._lastBoundsID)
        {
            this.calculateBounds();
        }

        if (!rect)
        {
            if (!this._boundsRect)
            {
                this._boundsRect = new Rectangle();
            }

            rect = this._boundsRect;
        }

        return this._bounds.getRectangle(rect);
    }

    /**
     * Retrieves the local bounds of the displayObject as a rectangle object
     *
     * @param {PIXI.Rectangle} [rect] - Optional rectangle to store the result of the bounds calculation
     * @return {PIXI.Rectangle} the rectangular bounding area
     */
    getLocalBounds(rect)
    {
        const transformRef = this.transform;
        const parentRef = this.parent;

        this.parent = null;
        this.transform = this._tempDisplayObjectParent.transform;

        if (!rect)
        {
            if (!this._localBoundsRect)
            {
                this._localBoundsRect = new Rectangle();
            }

            rect = this._localBoundsRect;
        }

        const bounds = this.getBounds(false, rect);

        this.parent = parentRef;
        this.transform = transformRef;

        return bounds;
    }

    /**
     * Calculates the global position of the display object
     *
     * @param {PIXI.Point} position - The world origin to calculate from
     * @param {PIXI.Point} [point] - A Point object in which to store the value, optional
     *  (otherwise will create a new Point)
     * @param {boolean} [skipUpdate=false] - Should we skip the update transform.
     * @return {PIXI.Point} A point object representing the position of this object
     */
    toGlobal(position, point, skipUpdate = false)
    {
        if (!skipUpdate)
        {
            this._recursivePostUpdateTransform();

            // this parent check is for just in case the item is a root object.
            // If it is we need to give it a temporary parent so that displayObjectUpdateTransform works correctly
            // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
            if (!this.parent)
            {
                this.parent = this._tempDisplayObjectParent;
                this.displayObjectUpdateTransform();
                this.parent = null;
            }
            else
            {
                this.displayObjectUpdateTransform();
            }
        }

        // don't need to update the lot
        return this.worldTransform.apply(position, point);
    }

    /**
     * Calculates the local position of the display object relative to another point
     *
     * @param {PIXI.Point} position - The world origin to calculate from
     * @param {PIXI.DisplayObject} [from] - The DisplayObject to calculate the global position from
     * @param {PIXI.Point} [point] - A Point object in which to store the value, optional
     *  (otherwise will create a new Point)
     * @param {boolean} [skipUpdate=false] - Should we skip the update transform
     * @return {PIXI.Point} A point object representing the position of this object
     */
    toLocal(position, from, point, skipUpdate)
    {
        if (from)
        {
            position = from.toGlobal(position, point, skipUpdate);
        }

        if (!skipUpdate)
        {
            this._recursivePostUpdateTransform();

            // this parent check is for just in case the item is a root object.
            // If it is we need to give it a temporary parent so that displayObjectUpdateTransform works correctly
            // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
            if (!this.parent)
            {
                this.parent = this._tempDisplayObjectParent;
                this.displayObjectUpdateTransform();
                this.parent = null;
            }
            else
            {
                this.displayObjectUpdateTransform();
            }
        }

        // simply apply the matrix..
        return this.worldTransform.applyInverse(position, point);
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {PIXI.WebGLRenderer} renderer - The renderer
     */
    renderWebGL(renderer) // eslint-disable-line no-unused-vars
    {
        // OVERWRITE;
    }

    /**
     * Renders the object using the Canvas renderer
     *
     * @param {PIXI.CanvasRenderer} renderer - The renderer
     */
    renderCanvas(renderer) // eslint-disable-line no-unused-vars
    {
        // OVERWRITE;
    }

    /**
     * Set the parent Container of this DisplayObject
     *
     * @param {PIXI.Container} container - The Container to add this DisplayObject to
     * @return {PIXI.Container} The Container that this DisplayObject was added to
     */
    setParent(container)
    {
        if (!container || !container.addChild)
        {
            throw new Error('setParent: Argument must be a Container');
        }

        container.addChild(this);

        return container;
    }

    /**
     * Convenience function to set the position, scale, skew and pivot at once.
     *
     * @param {number} [x=0] - The X position
     * @param {number} [y=0] - The Y position
     * @param {number} [scaleX=1] - The X scale value
     * @param {number} [scaleY=1] - The Y scale value
     * @param {number} [rotation=0] - The rotation
     * @param {number} [skewX=0] - The X skew value
     * @param {number} [skewY=0] - The Y skew value
     * @param {number} [pivotX=0] - The X pivot value
     * @param {number} [pivotY=0] - The Y pivot value
     * @return {PIXI.DisplayObject} The DisplayObject instance
     */
    setTransform(x = 0, y = 0, scaleX = 1, scaleY = 1, rotation = 0, skewX = 0, skewY = 0, pivotX = 0, pivotY = 0)
    {
        this.position.x = x;
        this.position.y = y;
        this.scale.x = !scaleX ? 1 : scaleX;
        this.scale.y = !scaleY ? 1 : scaleY;
        this.rotation = rotation;
        this.skew.x = skewX;
        this.skew.y = skewY;
        this.pivot.x = pivotX;
        this.pivot.y = pivotY;

        return this;
    }

    /**
     * Base destroy method for generic display objects. This will automatically
     * remove the display object from its parent Container as well as remove
     * all current event listeners and internal references. Do not use a DisplayObject
     * after calling `destroy`.
     *
     */
    destroy()
    {
        this.removeAllListeners();
        if (this.parent)
        {
            this.parent.removeChild(this);
        }

        if(this.transform) {
            this.transform.destroy();
            this.transform = null;
        }

        this.parent = null;

        this._bounds = null;
        this._currentBounds = null;
        this._mask = null;

        this.filterArea = null;

        this.interactive = false;
        this.interactiveChildren = false;

        this._root_ = null;

        this._destroyed = true;
    }


    /**
     * 添加事件监听器
     */
    addEventListener() {
        this.interactive = true;
        this.on.apply(this, arguments);
    }

    /**
     * 发送消息
     */
    dispatchEvent() {
        this.emit.apply(this, arguments);
    }

    /**
     * Hit test
     * @param dis {PIXI.DisplayObject}
     * @return {boolean}
     */
    hitTest(dis) {
        var conf = this;
        var localBoundsA = this.getLocalBounds().clone();
        var localBoundsB = dis.getLocalBounds().clone();
        this.updateTransform();
        dis.updateTransform();
        var rect1 = this.getBounds();
        var rect2 = dis.getBounds();
        // 矩形R1的4个顶点
        var r1TL = this.toGlobal({x: localBoundsA.x, y: localBoundsA.y});
        var r1TR = this.toGlobal({x: localBoundsA.x + localBoundsA.width, y: localBoundsA.y});
        var r1BL = this.toGlobal({x: localBoundsA.x, y: localBoundsA.y + localBoundsA.height});
        var r1BR = this.toGlobal({x: localBoundsA.x + localBoundsA.width, y: localBoundsA.y + localBoundsA.height});
        // 矩形R2的4个顶点
        var r2TL = dis.toGlobal({x: localBoundsB.x, y: localBoundsB.y});
        var r2TR = dis.toGlobal({x: localBoundsB.x + localBoundsB.width, y: localBoundsB.y});
        var r2BL = dis.toGlobal({x: localBoundsB.x, y: localBoundsB.y + localBoundsB.height});
        var r2BR = dis.toGlobal({x: localBoundsB.x + localBoundsB.width, y: localBoundsB.y + localBoundsB.height});

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

            //因为算出 x y 有误差 导致最终结果 出现问题 用num处理误差
            var num = 0.000001;

            /** 2 判断交点是否在两条线段上 **/
            if (// 交点在线段1上
            (x - a.x) * (x - b.x) <= num && (y - a.y) * (y - b.y) <= num
            // 且交点也在线段2上
            && (x - c.x) * (x - d.x) <= num && (y - c.y) * (y - d.y) <= num
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

        //判断是否相交
        function check() {
            var arr0 = [r1TL, r1TR, r1BR, r1BL];
            var arr1 = [r2TL, r2TR, r2BR, r2BL];
            // var arr0 = rectPoint(conf, globalA, localBoundsA);
            // var arr1 = rectPoint(dis, globalB, localBoundsB);
            for (var i = 0; i < arr0.length; i++) {
                var a0 = arr0[i];
                var a1 = arr0[(i + 1) % arr0.length];
                for (var j = 0; j < arr1.length; j++) {
                    var b0 = arr1[j];
                    var b1 = arr1[(j + 1) % arr1.length];
                    if (intersectPoint(a0, a1, b0, b1)) {
                        //throw intersectPoint (a0, a1, b0, b1)
                        intersectPoint(a0, a1, b0, b1);
                        return true;
                    }
                }

            }
            for (var i = 0; i < arr0.length; i++) {
                if (containsPoint(arr1, arr0[i])) {
                    return true;
                }
            }
            for (var i = 0; i < arr1.length; i++) {
                if (containsPoint(arr0, arr1[i])) {
                    return true;
                }
            }
            return false;
        }

        //点在矩形内
        function containsPoint(vs, p) {
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

        return check();
    }

    /**
     * Hit test point
     * @param p
     * @returns {boolean}
     */
    hitTestPoint(p) {
        var g = this.getBounds();
        return g.contains(p.x, p.y);
    }

    function(event, a1, a2, a3, a4, a5) {
        var evt = event;

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

    removeEventListener() {
        this.removeListener.apply(this, arguments);
    }

    removeListener(event, fn, capture, once) {
        var evt = event;
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

    once(event, fn, context) {
        var listener = new EE(fn, context || this, true)
            , evt = event;

        if (!this._events) this._events = Object.create(null);
        if (!this._events[evt]) this._events[evt] = listener;
        else {
            if (!this._events[evt].fn) this._events[evt].push(listener);
            else this._events[evt] = [
                this._events[evt], listener
            ];
        }

        return this;
    };

    on(event, fn, capture, priority) {
        var listener = new EE(fn, this)
            , evt = event;
        if (capture === undefined) {
            capture = false;
        }
        listener.capture = capture;
        listener.priority = priority || 0;

        if (!this._events) {
            this._events = Object.create(null);
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

    emit(event, a1, a2, a3, a4, a5) {
        var evt = prefix ? prefix + event : event;

        // 设置a1的默认值
        if (a1 && a1.capture === undefined && (typeof a1 === "object" || typeof a1 === "function")) {
            a1.capture = false;
        }

        if (!this._events || !this._events[evt]) return false;

        var listeners = this._events[evt]
            , len = arguments.length
            , args
            , i;

        if ('function' === typeof listeners.fn) {
            if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);
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

    /**
     * 获取根节点
     */
    get root() {
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
    }

    set root(value) {
        this._root_ = value;
    }

    /**
     * 获取当前容器所在的BaseEquipment容器
     */
    get currentEquipment() {
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
    }

    set currentEquipment(c) {
        this._currentEq_ = c;
    }

    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     * An alias to position.x
     *
     * @member {number}
     */
    get x()
    {
        return this.position.x;
    }

    set x(value) // eslint-disable-line require-jsdoc
    {
        this.transform.position.x = value;
    }

    /**
     * The position of the displayObject on the y axis relative to the local coordinates of the parent.
     * An alias to position.y
     *
     * @member {number}
     */
    get y()
    {
        return this.position.y;
    }

    set y(value) // eslint-disable-line require-jsdoc
    {
        this.transform.position.y = value;
    }

    /**
     * Current transform of the object based on world (parent) factors
     *
     * @member {PIXI.Matrix}
     * @readonly
     */
    get worldTransform()
    {
        return this.transform.worldTransform;
    }

    /**
     * Current transform of the object based on local factors: position, scale, other stuff
     *
     * @member {PIXI.Matrix}
     * @readonly
     */
    get localTransform()
    {
        return this.transform.localTransform;
    }

    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     * Assignment by value since pixi-v4.
     *
     * @member {PIXI.Point|PIXI.ObservablePoint}
     */
    get position()
    {
        return this.transform.position;
    }

    set position(value) // eslint-disable-line require-jsdoc
    {
        this.transform.position.copy(value);
    }

    /**
     * The scale factor of the object.
     * Assignment by value since pixi-v4.
     *
     * @member {PIXI.Point|PIXI.ObservablePoint}
     */
    get scale()
    {
        return this.transform.scale;
    }

    set scale(value) // eslint-disable-line require-jsdoc
    {
        this.transform.scale.copy(value);
    }

    /**
     * The pivot point of the displayObject that it rotates around
     * Assignment by value since pixi-v4.
     *
     * @member {PIXI.Point|PIXI.ObservablePoint}
     */
    get pivot()
    {
        return this.transform.pivot;
    }

    set pivot(value) // eslint-disable-line require-jsdoc
    {
        this.transform.pivot.copy(value);
    }

    /**
     * The skew factor for the object in radians.
     * Assignment by value since pixi-v4.
     *
     * @member {PIXI.ObservablePoint}
     */
    get skew()
    {
        return this.transform.skew;
    }

    set skew(value) // eslint-disable-line require-jsdoc
    {
        this.transform.skew.copy(value);
    }

    /**
     * The rotation of the object in radians.
     *
     * @member {number}
     */
    get rotation()
    {
        return this.transform.rotation;
    }

    set rotation(value) // eslint-disable-line require-jsdoc
    {
        this.transform.rotation = value;
    }

    /**
     * Indicates if the object is globally visible.
     *
     * @member {boolean}
     * @readonly
     */
    get worldVisible()
    {
        let item = this;

        do
        {
            if (!item.visible)
            {
                return false;
            }

            item = item.parent;
        } while (item);

        return true;
    }

    /**
     * Sets a mask for the displayObject. A mask is an object that limits the visibility of an
     * object to the shape of the mask applied to it. In PIXI a regular mask must be a
     * PIXI.Graphics or a PIXI.Sprite object. This allows for much faster masking in canvas as it
     * utilises shape clipping. To remove a mask, set this property to null.
     *
     * @todo For the moment, PIXI.CanvasRenderer doesn't support PIXI.Sprite as mask.
     *
     * @member {PIXI.Graphics|PIXI.Sprite}
     */
    get mask()
    {
        return this._mask;
    }

    set mask(value) // eslint-disable-line require-jsdoc
    {
        if (this._mask)
        {
            this._mask.renderable = true;
            this._mask.isMask = false;
        }

        this._mask = value;

        if (this._mask)
        {
            this._mask.renderable = false;
            this._mask.isMask = true;
        }
    }

    /**
     * Sets the filters for the displayObject.
     * * IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
     * To remove filters simply set this property to 'null'
     *
     * @member {PIXI.Filter[]}
     */
    get filters()
    {
        return this._filters && this._filters.slice();
    }

    set filters(value) // eslint-disable-line require-jsdoc
    {
        this._filters = value && value.slice();
    }
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

DisplayObject.prototype.has = EventEmitter.prototype.hasEventListener = function(eventType) {
    var evt = prefix ? prefix + eventType : eventType;
    if (!this._events || !this._events[evt]) {
        return false;
    }
    return true;
}

// performance increase to avoid using call.. (10x faster)
DisplayObject.prototype.displayObjectUpdateTransform = DisplayObject.prototype.updateTransform;
