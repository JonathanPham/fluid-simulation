Function.prototype.inheritFrom = function (parentClass) {
	if(parentClass.constructor == Function) {
		this.prototype = new parentClass;
		this.prototype.constructor = this;
		this.prototype.parent = parentClass.prototype;
	}
	else
		console.log('inheritFrom warning!');				//USUNĄĆ PÓŹNIEJ
}

function Particle(x, y) {
	this.coords = {x: x, y: y};
	this.color = "#f00";
	this.mass = 1.0;
	this.init();
}
Particle.prototype.init = function () {
	this.velocity = {x: 0.0, y: 0.0};
	this.forces = {x: 0.0, y: 0.0};
	this.pressure = {normal: 0, near: 0};
	this.coeffs = {
		 k: 0.2
		,k_near: 0.6
		,p0: 5
		,visc_lin: 0.105
		,visc_qua: 0.055
		,d_stick: 35		//Distance from wall, at which fluid starts sticking
		,k_stick: 0.01
		,wall_friction: 0.1	//Wall sideways friction (vx *= wall_friction) (0 - max. friction; 1 - no friction)
		,wall_normal: 0.9	//Wall bounce energy conservation
	};
	return this;
}
Particle.prototype.setCoords = function (x, y) {
	this.coords.x = x;
	this.coords.y = y;
	return this;
}
Particle.prototype.changeCoordsBy = function (dx, dy) {
	this.coords.x += dx;
	this.coords.y += dy;
	return this;
}
Particle.prototype.setVelocity = function (vx, vy) {
	this.velocity.x = vx;
	this.velocity.y = vy;
	return this;
}
Particle.prototype.changeVelocityBy = function (dvx, dvy) {
	this.velocity.x += dvx;
	this.velocity.y += dvy;
	return this;
}
Particle.prototype.multipleVelocityBy = function (mvx, mvy) {
	this.velocity.x *= mvx;
	this.velocity.y *= mvy;
	return this;
}
Particle.prototype.render = function (ctx) {
	ctx.fillStyle = this.color;
	ctx.fillRect(this.coords.x, this.coords.y, 4, 4);
	return this;
}
Particle.prototype.getDistance = function (particle) {
	return Math.sqrt((particle.coords.x - this.coords.x) * (particle.coords.x - this.coords.x) + (particle.coords.y - this.coords.y) * (particle.coords.y - this.coords.y));
};
Particle.prototype.applyForce = function (x, y) {
	this.forces.x += x;
	this.forces.y += y;
}
Particle.prototype.getForces = function () {
	return this.forces;
}
Particle.prototype.setForces = function (x, y) {
	this.forces.x = x;
	this.forces.y = y;
	return this;
}
Particle.prototype.multipleForcesBy = function (x, y) {
	this.forces.x *= x;
	this.forces.y *= y;
	return this;
}
Particle.prototype.clearForces = function () {
	this.forces = {x: 0, y: 0};
	return this;
}
Particle.prototype.clearPressure = function () {
	this.pressure = {normal: 0, near: 0};
	return this;
}
Particle.prototype.clear = function () {
	this.forces = {x: 0, y: 0};
	this.pressure = {normal: 0, near: 0};
	return this;
}
Particle.prototype.setPressure = function (normal, near) {
	this.pressure.normal = normal;
	this.pressure.near = near;
	return this;
}
Particle.prototype.increasePressure = function (normal, near) {
	this.pressure.normal += normal;
	this.pressure.near += near;
	return this;
}
Particle.prototype.onTheLeft = function (a, b) {
	return (b.coords.x - a.coords.x)*(this.coords.y - a.coords.y) - (this.coords.x - a.coords.x)*(b.coords.y - a.coords.y);
}
//------------------------------------------------
function WaterParticle(x, y) {
	this.coords = {x: x, y: y};
	this.color = "#00f";
	this.mass = 0.6;
	this.init();
}
WaterParticle.inheritFrom(Particle);