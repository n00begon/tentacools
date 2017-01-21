/// <reference path="../tsd/phaser.d.ts"/>

const maxForce = 2000; // who knows
const SHOW_PHYSICS_DEBUG = false;

declare const dat: any;
const gui = new dat.GUI();
const armsTotal = 5;


var tweaks = {
	stiffness: 10,
	damping: 500,
	mouthMass: 25,
	tentacleForce: 300,
	armLengthStiffness: 30,
	armLengthRelaxation: 10  // 35?
}

function extendGuiParameterToSupportMultipleListeners(guiParam) {
	guiParam.___changeCallbacks___ = [];
	guiParam.addListener = (function (callback) {
		this.___changeCallbacks___.push(callback);
	}).bind(guiParam);
	guiParam.onChange((function (val) {
		this.___changeCallbacks___.forEach(cb => cb(val));
	}).bind(guiParam));
}

var stiffness = gui.add(tweaks, 'stiffness', 1, 50);
extendGuiParameterToSupportMultipleListeners(stiffness);

var damping = gui.add(tweaks, 'damping', 1, 500);
extendGuiParameterToSupportMultipleListeners(damping);

var mouthMass = gui.add(tweaks, 'mouthMass', 1, 500);

var tentacleForce = gui.add(tweaks, 'tentacleForce', 10, 500);

var armLengthStiffness = gui.add(tweaks, 'armLengthStiffness', 1, 50);
extendGuiParameterToSupportMultipleListeners(armLengthStiffness);

var armLengthRelaxation = gui.add(tweaks, 'armLengthRelaxation', 1, 50);
extendGuiParameterToSupportMultipleListeners(armLengthRelaxation);

class Arm {

	static armIdCounter: number = 0;

	id: number;
	sprite: Phaser.Group;
	balls: Phaser.Sprite[];
	game: Phaser.Game;
	tip: Phaser.Sprite;
	springs: any[];
	hinges: Phaser.Physics.P2.RevoluteConstraint[];


	constructor(game: Phaser.Game, spriteName: String, armNumber: number, total: number) {
		this.game = game;
		this.balls = [];
		this.springs = [];
		this.hinges = [];
		this.sprite = new Phaser.Group(this.game);

		const angle = Math.PI * 2 * (armNumber / total);
		const segmentLength = 10;
		const totalMass = 1;
		const segmentCount = 15;

		for (var i = 0; i < segmentCount; i++) {
			let x = Math.cos(angle) * i * segmentLength;
			let y = Math.sin(angle) * i * segmentLength;
			var ball: Phaser.Sprite = this.game.add.sprite(x, y, spriteName);
			ball.scale.set(1 / (1 + i / (segmentCount - 1)));
			this.balls.push(ball);
		}
		this.game.physics.p2.enable(this.balls, SHOW_PHYSICS_DEBUG);
		this.tip = this.balls[this.balls.length - 1];

		var lastBall: Phaser.Sprite = null;
		this.balls.forEach(b => {
			b.body.mass = totalMass / segmentCount;
			b.body.collideWorldBounds = false;

			if (lastBall) {
				var hinge = this.game.physics.p2.createRevoluteConstraint(b, [0, 0], lastBall, [0, 20], maxForce);
				// hinge.setStiffness(armLengthStiffness);
				// hinge.setRelaxation(armLengthRelaxation);
				this.hinges.push(hinge);

				var spring = this.game.physics.p2.createRotationalSpring(b, lastBall, 0, tweaks.stiffness, tweaks.damping);
				this.springs.push(spring);
			}
			lastBall = b;
		});

		stiffness.addListener((value) => {
			this.springs.forEach(s => {
				s.data.stiffness = value;
				console.log("stiff", value, this.id);
			});
		});
		damping.addListener((value) => {
			this.springs.forEach(s => {
				s.data.damping = value;
				console.log("damp", value, this.id);
			});
		});
		armLengthStiffness.addListener(value => {
			this.hinges.forEach(h => {
				h.setStiffness(value);
			})
		});
		armLengthRelaxation.addListener(value => {
			this.hinges.forEach(h => {
				h.setRelaxation(value);
			})
		});
	}

	getBase() {
		return this.balls[0].body;
	}

	attachTo(body: Phaser.Physics.P2.Body, rotation: number) {
		this.game.physics.p2.createRevoluteConstraint(body, [0, 0], this.getBase(), [0, 0], maxForce);
		const USELESS = 0; // setting rest rotation in constructor doesn't work properly for some mysterious reason
		var rotationSpring = this.game.physics.p2.createRotationalSpring(body, this.getBase(), USELESS, 120, 5);
		rotationSpring.data.restAngle = rotation;
	}
}

class SimpleGame {
	game: Phaser.Game;
	mouth: Phaser.Sprite;

	cursors: Phaser.CursorKeys;
	cursors2: Phaser.CursorKeys;
	cursors3: Phaser.CursorKeys;

	j1: Phaser.Physics.P2.RevoluteConstraint;
	j2: Phaser.Physics.P2.RevoluteConstraint;
	j3: Phaser.Physics.P2.RevoluteConstraint;

	armList: Arm[];
	keyList = [];

	constructor() {
		this.game = new Phaser.Game(640, 480, Phaser.AUTO, 'content', {
			create: this.create, preload: this.preload, update: this.update
		});
	}
	preload() {
		this.game.load.image('background', 'assets/debug-grid-1920x1920.png');
	}

	create() {

		this.game.add.tileSprite(0, 0, 1920, 1920, 'background');

		this.game.world.setBounds(0, 0, 1920, 1920);

		this.mouth = this.game.add.sprite(this.game.width / 2, this.game.height / 2, "mouth");
		this.mouth.bringToTop();

		// this.mouth.scale.set(0.1);
		// this.arm1.scale.set(0.1);
		// this.arm2.scale.set(0.1);
		// this.arm3.scale.set(0.1);

		this.game.physics.startSystem(Phaser.Physics.P2JS);
		this.game.camera.follow(this.mouth);

		// Enabled physics on mouth
		this.game.physics.p2.enable([this.mouth], SHOW_PHYSICS_DEBUG);

		// setup behaviour of individual bits

		this.mouth.body.mass = tweaks.mouthMass;
		mouthMass.onChange(value => this.mouth.body.mass = value);
		this.keyList = [];
		var setupCursors = () => {
			this.keyList[0] = this.game.input.keyboard.createCursorKeys();
			this.keyList[1] = {
				left: this.game.input.keyboard.addKey(Phaser.Keyboard.A),
				right: this.game.input.keyboard.addKey(Phaser.Keyboard.D),
				up: this.game.input.keyboard.addKey(Phaser.Keyboard.W),
				down: this.game.input.keyboard.addKey(Phaser.Keyboard.S),
			}
			this.keyList[2] = {
				left: this.game.input.keyboard.addKey(Phaser.Keyboard.J),
				right: this.game.input.keyboard.addKey(Phaser.Keyboard.L),
				up: this.game.input.keyboard.addKey(Phaser.Keyboard.I),
				down: this.game.input.keyboard.addKey(Phaser.Keyboard.K),
			}
			this.keyList[3] = {
				left: this.game.input.keyboard.addKey(Phaser.Keyboard.J),
				right: this.game.input.keyboard.addKey(Phaser.Keyboard.L),
				up: this.game.input.keyboard.addKey(Phaser.Keyboard.I),
				down: this.game.input.keyboard.addKey(Phaser.Keyboard.K),
			}
			this.keyList[4] = {
				left: this.game.input.keyboard.addKey(Phaser.Keyboard.F),
				right: this.game.input.keyboard.addKey(Phaser.Keyboard.H),
				up: this.game.input.keyboard.addKey(Phaser.Keyboard.T),
				down: this.game.input.keyboard.addKey(Phaser.Keyboard.G),
			}
			this.keyList[5] = {
				left: this.game.input.keyboard.addKey(Phaser.Keyboard.Z),
				right: this.game.input.keyboard.addKey(Phaser.Keyboard.V),
				up: this.game.input.keyboard.addKey(Phaser.Keyboard.X),
				down: this.game.input.keyboard.addKey(Phaser.Keyboard.C),
			}
		}
		setupCursors();

		var createNoodlyAppendage = (imageName, rotation, armNumber, total) => {
			var arm = new Arm(this.game, imageName, armNumber, total);
			this.game.world.add(arm.sprite);
			arm.attachTo(this.mouth.body, rotation);
			return arm;
		}
		this.armList = [];
		for (let a = 0; a < armsTotal; ++a) {
			this.armList[a] = createNoodlyAppendage("arm" + a + 1, 2 * Math.PI * (a / armsTotal), a, armsTotal);
		}

		//this.mouth.body.rotateRight(3000); // temp hack, counter inertial twisting of initialisation of appendages

		window["game"] = this;
	}

	update() {
		function forceBody(arm, keys, forceAmt) {
			if (keys.left.isDown) {
				arm.body.force.x = -forceAmt;
				// arm.body.rotateLeft(forceAmt)
			}
			else if (keys.right.isDown) {
				arm.body.force.x = forceAmt;
				// arm.body.rotateRight(forceAmt);
			}

			if (keys.up.isDown) {
				arm.body.force.y = -forceAmt;
			}
			else if (keys.down.isDown) {
				arm.body.force.y = forceAmt;
			}

		}

		for (let a = 0; a < armsTotal; ++a) {
			forceBody(this.armList[a].tip, this.keyList[a], tweaks.tentacleForce);
		}
	}
}

window.onload = () => {
	var game = new SimpleGame();
};

function armDraw() {
	var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { create: create });

	function create() {

		var graphics = game.add.graphics(100, 100);
		var length = 100;
		let total = 5;
		for (let count = 0; count < total; ++count) {
			graphics.lineStyle(5, 0x33FF00);
			graphics.moveTo(0, 0);
			let angle = Math.PI * 2 * (count / total);
			let x = Math.cos(angle) * length;
			let y = Math.sin(angle) * length;
			//	console.log(x,y, angle);
			graphics.lineTo(x, y);
		}

	}
}