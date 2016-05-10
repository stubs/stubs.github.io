function Drop(){
  this.x = random(width);
  this.y = random(-1000, -10);
  this.z = random(0, 20);
  this.len = map(this.z, 0, 20, 10, 30);
  this.yspeed = map(this.z, 0, 20, 4, 10);
  
  this.show = function() {
    var thick = map(this.z, 0, 20, 1, 3);
    line(this.x, this.y, this.x, this.y + this.len);
    stroke(138, 43, 226);
    strokeWeight(thick);
  }
  
  this.fall = function() {
    this.y = this.y + this.yspeed;
    this.yspeed = this.yspeed + .2;
    if (this.y > height) {
      this.y = random(-100, -50);
      this.yspeed = map(this.z, 0, 20, 4, 10);
    }
  }
}