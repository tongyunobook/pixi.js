/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 * An observable point is a point that triggers a callback when the point's position is changed.
 *
 * @class
 * @memberof PIXI
 */
export default class ObservablePoint
{
    /**
     * @param {Function} cb - callback when changed
     * @param {object} scope - owner of callback
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     */
    constructor(cb, scope, x = 0, y = 0)
    {
        this._x = x;
        this._y = y;

        this.cb = cb;
        this.scope = scope;
    }

    /**
     * Sets the point to a new x and y position.
     * If y is omitted, both x and y will be set to x.
     *
     * @param {number} [x=0] - position of the point on the x axis
     * @param {number} [y=0] - position of the point on the y axis
     */
    set(x, y)
    {
        const _x = x || 0;
        const _y = y || ((y !== 0) ? _x : 0);

        if (this._x !== _x || this._y !== _y)
        {
            this._x = _x;
            this._y = _y;
            if(this.cb) this.cb.call(this.scope);
        }
    }

    /**
     * Copies the data from another point
     *
     * @param {PIXI.Point|PIXI.ObservablePoint} point - point to copy from
     */
    copy(point)
    {
        if (this._x !== point.x || this._y !== point.y)
        {
            this._x = point.x;
            this._y = point.y;
            if(this.cb) this.cb.call(this.scope);
        }
    }

    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     *
     * @member {number}
     */
    get x()
    {
        return this._x;
    }

    set x(value) // eslint-disable-line require-jsdoc
    {
        if (this._x !== value)
        {
            this._x = value;
            if(this.cb) this.cb.call(this.scope);
        }
    }

    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     *
     * @member {number}
     */
    get y()
    {
        return this._y;
    }

    set y(value) // eslint-disable-line require-jsdoc
    {
        if (this._y !== value)
        {
            this._y = value;
            if(this.cb) this.cb.call(this.scope);
        }
    }

    clone() {
        return new ObservablePoint(null, null, this._x, this._y);
    }

    equals(p) {
        return (p.x === this.x) && (p.y === this.y);
    }

    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    add (v) {
        return new ObservablePoint(null, null, this._x + v.x, this._y + v.y);
    }

    subtract (v) {
        return new ObservablePoint(null, null, this._x - v.x, this._y - v.y);
    }

    sub(v) {
        return this.subtract(v);
    }

    setTo (xa, ya) {
        this.x = xa;
        this.y = ya;
    }

    destroy() {
        this.cb = null;
        this.scope = null;
    }
}
