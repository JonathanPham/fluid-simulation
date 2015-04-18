function World(width, height) {
	this.en = new Array(50);
	this.width = width;
	this.height = height;
	this.gravity = {x: 0.0, y: 0.5};
	this.timeSpeed = 1.0/60;
	this.coeffs = {
		 h: 50				//Particles' distance from each other, at which they start interacting
		,d_stick: 35		//Distance from wall, at which fluid starts sticking
		,k_stick: 0.01
		,k: 0.2
		,k_near: 0.6
		,p0: 5
		,visc_lin: 0.011
		,visc_qua: 0.003
		,wall_friction: 0.1	//Wall sideways friction (vx *= wall_friction) (0 - max. friction; 1 - no friction)
		,wall_normal: 0.9	//Wall bounce energy conservation
	};
	this.particles = [];
	this.bodies = [];
	this.grid = new Grid(this.particles, this.coeffs.h);	//Przy zmianie coeffs, NIE zmieni się cellSize w siatce!
}
World.prototype.setCoeffs = function (coeffs) {
	for(var i in coeffs) {
		this.coeffs[i] = coeffs[i];
	}
	this.grid.cellSize = this.coeffs.h;
	return this;
}
World.prototype.addBody = function (body) {
	this.bodies.push(body);
}
World.prototype.addParticles = function (particles) {
	if(Array.isArray(particles))
		this.particles.push.apply(this.particles, particles);
	else
		this.particles.push(particles);
	return this;
}
World.prototype.addParticlesGrid = function (X, Y, startX, particleClass) {
	var space = 15;
	var startY = space;
	var particlesArr = [];
	for(var x = 0; x < X; x++) {
		for(var y = 0; y < Y; y++) {
			particlesArr.push(
				new particleClass(
					 startX + x * space
					,this.height - (startY + y * space)
				)
			);
		}
	}
	this.addParticles(particlesArr);
	return this;
}
World.prototype.setGravity = function(gravity) {
	this.gravity.x = gravity.x;
	this.gravity.y = gravity.y;
	return this;
}
World.prototype.nextStep = function (dt) {
	dt *= this.timeSpeed;
	//apply gravity
	for(var i in this.particles) {
		var mass = this.particles[i].mass;
		this.particles[i].clearForces();
		this.particles[i].applyForce(this.gravity.x*mass, this.gravity.y*mass);
	}
	
	this.applyDoubleDensityRelaxation()
		.applyViscosity(dt)
		.applyCollisionsHandling();
	
	
	//Apply velocity and position change
	for(var i=0; i<this.particles.length; i++) {
		var forces = this.particles[i].getForces();
		var mass = this.particles[i].mass;
		this.particles[i].changeVelocityBy(dt*forces.x/mass, dt*forces.y/mass);
		this.particles[i].clearForces();
		this.particles[i].changeCoordsBy(dt*this.particles[i].velocity.x, dt*this.particles[i].velocity.y);
	}
	return this;
}
World.prototype.applyDoubleDensityRelaxation = function () {
	for(var i = 0; i < this.particles.length; i++) {
		this.particles[i].clearPressure();
	}
	this.grid.forEachPair(function (self, A, B) {
		var r = A.getDistance(B);
		var q = r / self.coeffs.h;
		if(q < 1) {
			var p = (1-q) * (1-q);
			var p_near = p * (1-q);
			A.increasePressure(p, p_near);
			B.increasePressure(p, p_near);
		}
	}, this);
	for(var i = 0; i < this.particles.length; i++) {
		this.particles[i].setPressure(
			this.coeffs.k*(this.particles[i].pressure.normal-this.coeffs.p0),
			this.coeffs.k_near*this.particles[i].pressure.near
		);
	}
	this.grid.forEachPair(function (self, A, B) {
		var r = A.getDistance(B);
		var q = r / self.coeffs.h;
		if(q < 1) {
			var xr = (A.coords.x-B.coords.x)/r;
			var yr = (A.coords.y-B.coords.y)/r;
			
			var a1=(A.pressure.normal*(1-q)+A.pressure.near*(1-q)*(1-q))/2;
			var a2=(B.pressure.normal*(1-q)+B.pressure.near*(1-q)*(1-q))/2;
			
			A.applyForce((a1+a2)*xr, (a1+a2)*yr);
			B.applyForce(-(a1+a2)*xr, -(a1+a2)*yr);
		}
	}, this);
	return this;
}
World.prototype.applyViscosity = function (dt) {
	this.grid.forEachPair(function (self, A, B) {
		var r = A.getDistance(B);
		var q = r / self.coeffs.h;
		if(q < 1) {
			var ux = A.velocity.x - B.velocity.x;
			var uy = A.velocity.y - B.velocity.y;
			var u = Math.sqrt(ux*ux+uy*uy);
			
			var I = (1-q)*(self.coeffs.visc_lin*u+self.coeffs.visc_qua*u*u);
			var Ix = (ux/u)*I;
			var Iy = (uy/u)*I;
			//*
			if(u == 0) {
				Ix = 0;
				Iy = 0;
			}
			//*/
			if(isNaN(Ix) || isNaN(Iy)) {
				console.error('Errorrek');
				console.error(A.velocity.x, B.velocity.x);
				console.error(u, ux, uy, I, Ix, Iy);
			}
			//this.particles[i].applyForce(-Ix, -Iy);
			//this.particles[j].applyForce(Ix, Iy);
			
			A.changeVelocityBy(-dt*Ix, -dt*Iy);
			B.changeVelocityBy(dt*Ix, dt*Iy);
		}
	}, this);
	return this;
}
World.prototype.applyCollisionsHandling = function () {
	const extractDistance = 0.001;
	for(var i = 0; i < this.particles.length; i++) {
		var r = this.height - this.particles[i].coords.y;
		if(r < this.coeffs.d_stick) {
			var F_stick = this.coeffs.k_stick * r * (1 - (r / this.coeffs.d_stick));
			this.particles[i].applyForce(0, F_stick);
			if(r < 0) {
				this.particles[i].multipleForcesBy(this.coeffs.wall_friction, -this.coeffs.wall_normal);
				this.particles[i].multipleVelocityBy(this.coeffs.wall_friction, -this.coeffs.wall_normal);
				this.particles[i].setCoords(this.particles[i].coords.x, this.height - extractDistance);
			}
		}
		var r = this.width - this.particles[i].coords.x;
		if(r < this.coeffs.d_stick) {
			var F_stick = this.coeffs.k_stick * r * (1 - (r / this.coeffs.d_stick));
			this.particles[i].applyForce(F_stick, 0);
			if(r < 0) {
				this.particles[i].multipleForcesBy(-this.coeffs.wall_normal, this.coeffs.wall_friction);
				this.particles[i].multipleVelocityBy(-this.coeffs.wall_normal, this.coeffs.wall_friction);
				this.particles[i].setCoords(this.width - extractDistance, this.particles[i].coords.y);
			}
		}
		var r = this.particles[i].coords.x;
		if(r < this.coeffs.d_stick) {
			var F_stick = this.coeffs.k_stick * r * (1 - (r / this.coeffs.d_stick));
			this.particles[i].applyForce(-F_stick, 0);
			if(r < 0) {
				this.particles[i].multipleForcesBy(-this.coeffs.wall_normal, this.coeffs.wall_friction);
				this.particles[i].multipleVelocityBy(-this.coeffs.wall_normal, this.coeffs.wall_friction);
				this.particles[i].setCoords(extractDistance, this.particles[i].coords.y);
			}
		}
	}
	return this;
}
//*/
World.prototype.render = function (ctx) {
	ctx.clearRect(0, 0, this.width*2, this.height*2);
	ctx.fillStyle="rgb(70, 70, 255)";
	ctx.lineWidth = 5;
	for(var i = 0; i < this.particles.length; i++) {
		this.particles[i].render(ctx);
	}
	for(var i = 0; i < this.bodies.length; i++) {
		this.bodies[i].render(ctx);
	}
	return this;
}
World.prototype.render2 = function (ctx) {
	ctx.clearRect(0, 0, this.width, this.height);
	ctx.fillStyle="rgb(70, 70, 255)";
	for(var i = 0; i < this.particles.length; i++) {
		var neighbors = this.getNeighborsArray(this.particles[i], 0.8*this.coeffs.h);
		if(neighbors.length == 1) {
			neighbors[0].render(ctx);
		}
		else {
			var convexHull = this.getConvexHull(neighbors);
			ctx.beginPath();
			ctx.moveTo(convexHull[0].coords.x, convexHull[0].coords.y);
			for(var j = 1; j < convexHull.length; j++)
				ctx.lineTo(convexHull[j].coords.x, convexHull[j].coords.y);
			ctx.closePath();
			ctx.fill();
		}
	}
}
World.prototype.getConvexHull = function (particles) {
	var convexHull = [];
	var maxIndex = 0;
	var maxX = particles[0].coords.x;
	for(var i = 1; i < particles.length; i++) {
		if(particles[i].coords.x > maxX) {
			maxIndex = i;
			maxX = particles[i].coords.x;
		}
	}
	var hullPoint = particles[maxIndex];
	var i = 0;
	var nextPoint;
	do {
		convexHull[i] = hullPoint;
		nextPoint = particles[0];
		if(nextPoint == hullPoint)
			nextPoint = particles[1];
		for(var j = 0; j < particles.length; j++) {
			if(hullPoint != nextPoint && particles[j].onTheLeft(hullPoint, nextPoint) > 0)
				nextPoint = particles[j];
		}
		i++;
		hullPoint = nextPoint;
	}
	while(nextPoint != convexHull[0]);
	return convexHull;
}
World.prototype.getNeighborsArray = function (particle, radius) {
	var neighbors = [];
	for(var i = 0; i < this.particles.length; i++) {
		if(particle.getDistance(this.particles[i]) < radius)
			neighbors.push(this.particles[i]);
	}
	return neighbors;
}