var drops = [];
var amount = 700;

function setup() {
  createCanvas(1000, 800);
  for (var i = 0; i < amount; i++) {
    drops[i] = new Drop();
  }
}

function draw() {
  background(230, 230, 250);
  for (var i = 0; i < drops.length; i++) {
    drops[i].show();
    drops[i].fall();
  }
}