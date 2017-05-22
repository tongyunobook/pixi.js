/**
 * @namespace PIXI.mesh
 */
<<<<<<< HEAD
export { default as Mesh } from './Mesh';
export { default as MeshRenderer } from './webgl/MeshRenderer';
export { default as CanvasMeshRenderer } from './canvas/CanvasMeshRenderer';
export { default as Plane } from './Plane';
export { default as NineSlicePlane } from './NineSlicePlane';
export { default as Rope } from './Rope';
=======
module.exports = {
    Mesh:           require('./Mesh'),
    Plane:           require('./Plane'),
    Rope:           require('./Rope'),
    MeshShader:     require('./webgl/MeshShader'),
    RopeBitmap:     require('./RopeBitmap')
};
>>>>>>> nobook_pixi
