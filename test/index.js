document.addEventListener('DOMContentLoaded', () => {
  TouchEvent.TOUCH_BEGIN = 'pointerdown';
  TouchEvent.TOUCH_END = 'pointerup';
  TouchEvent.TOUCH_MOVE = 'pointermove';
  TouchEvent.TOUCH_END_OUTSIDE = 'pointerupoutside';
  startPixi();
});

function startPixi() {
  const app = new PIXI.Application({
    width: window.innerWidth, height: window.innerHeight, backgroundColor: 0x1099bb, resolution: window.devicePixelRatio || 1,
  });
  document.body.appendChild(app.view);
  // const container = new PIXI.Container();

  // app.stage.addChild(container);

  const bg = new PIXI.Graphics();
  bg.beginFill(0xFF0000, 0.3);
  bg.drawRect(0, 0, window.innerWidth, window.innerHeight);
  bg.endFill();
  app.stage.addChild(bg);
  addTouch(bg);
  // Listen for animate update
  app.ticker.add((delta) => {
    // rotate the container!
    // use delta to create frame-independent transform
  });
}

function addTouch(target) {
  target.addEventListener(TouchEvent.TOUCH_BEGIN, touchBegin);
  // target.addEventListener(TouchEvent.TOUCH_MOVE)
}

function touchBegin(evt) {
  console.log(evt.data.originalEvent.touches);
}
