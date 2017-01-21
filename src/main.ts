/// <reference path="../tsd/phaser.d.ts"/>

const maxForce = 2000; // who knows
const SHOW_PHYSICS_DEBUG = true;
const MOTION_FORCE = 5;
declare const dat: any;
const gui = new dat.GUI();
const armsTotal = 3;
const foodCount = 100;
const urchinCount = 100;
const shellCount = 100

var tweaks = {
	stiffness: 10,
	damping: 500,
	mouthMass: 10,
	tentacleForce: 100,
	armLengthStiffness: 30,
	armLengthRelaxation: 10
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

class SimpleGame {
	game: Phaser.Game;
	mouth: Phaser.Sprite;

	armList: Arm[];
	keyList = [];

	allFood: Phaser.Group;
	urchinGroup: Phaser.Group; //Declare ALL the globals

	armsCollisionGroups: Phaser.Physics.P2.CollisionGroup[];

	constructor() {
		this.game = new Phaser.Game(640, 480, Phaser.AUTO, 'content', {
			create: this.create, preload: this.preload, update: this.update
		});
	}
	preload() {
		this.game.load.image('background', 'assets/debug-grid-1920x1920.png');
		this.game.load.image('food', 'assets/food.gif');
		this.game.load.image('shell', 'assets/shell.gif');
		//	this.game.load.image('segment', 'assets/segment.png');
	}

	create() {

		this.game.add.tileSprite(0, 0, 1920, 1920, 'background');

		this.game.world.setBounds(0, 0, 1920, 1920);

		console.log(this.game.world.centerX, this.game.world.centerY);

		this.mouth = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, "mouth");
		this.mouth.bringToTop();

		this.game.physics.startSystem(Phaser.Physics.P2JS);
		this.game.camera.follow(this.mouth);

		// Enabled physics on mouth
		this.game.physics.p2.enable([this.mouth], SHOW_PHYSICS_DEBUG);
        this.game.physics.p2.setImpactEvents(true);

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
		
		// Collision groups
		var foodCollisionGroup = this.game.physics.p2.createCollisionGroup();
		var shellCollisionGroup = this.game.physics.p2.createCollisionGroup();
        var urchinCollisionGroup = this.game.physics.p2.createCollisionGroup();
		var mouthCollisionGroup = this.game.physics.p2.createCollisionGroup();
		this.armsCollisionGroups = [];

		this.game.physics.p2.updateBoundsCollisionGroup();

		
		for (let i = 0; i < armsTotal; i++) {
			this.armsCollisionGroups.push(this.game.physics.p2.createCollisionGroup());
		}

		// var foodHitArm = (playerBody, foodBody) => {
		// 	let sprite = foodBody.sprite;
		// 	sprite.kill();if (sprite.group){   sprite.group.remove(sprite);}else if (sprite.parent){   sprite.parent.removeChild(sprite);}
		// 	foodBody.destroy();
		// };

		var foodHitMouth = (playerBody, foodBody) => {
			let sprite = foodBody.sprite;
			sprite.kill();if (sprite.group){   sprite.group.remove(sprite);}else if (sprite.parent){   sprite.parent.removeChild(sprite);}
			foodBody.destroy();
		};

		var urchinHitPlayer = (playerBody, urchinBody) => {
			// Do reactionary things
			console.log("Hit urchin");


		};

		var createNoodlyAppendage = (armIndex) => {
			var arm = new Arm(this.game, armIndex);
			this.game.world.add(arm.sprite);
			let appendageRotation = 2 * Math.PI * (armIndex / armsTotal);
			arm.attachTo(this.mouth.body, appendageRotation);
			return arm;
		}

		this.armList = [];
		for (let a = 0; a < armsTotal; ++a) {
			this.armList[a] = createNoodlyAppendage(a);
			this.armList[a].balls.forEach(ball => {
				ball.body.setCollisionGroup(this.armsCollisionGroups[a]);
				ball.body.collides([foodCollisionGroup, shellCollisionGroup]);
				ball.body.collides(urchinCollisionGroup, urchinHitPlayer);

				for (let i = 0; i < armsTotal; i++) { // There must be a javascript way todo this - find later.
					if (i != a) {
						ball.body.collides(this.armsCollisionGroups[i]);
					}
				}
			});
		}

		this.mouth.body.setCollisionGroup(mouthCollisionGroup);
		this.mouth.body.collides(foodCollisionGroup, foodHitMouth)
		this.mouth.body.collides(urchinCollisionGroup, urchinHitPlayer);

		this.allFood = this.game.add.group();
		this.allFood.enableBody = true;
		this.allFood.physicsBodyType = Phaser.Physics.P2JS;

		for (var i = 0; i < foodCount; i++) {
			var food = this.allFood.create(this.game.world.randomX, this.game.world.randomY, 'food');
			food.body.setRectangle(20, 20);
			food.body.setCollisionGroup(foodCollisionGroup);
			food.body.collides(this.armsCollisionGroups.concat([foodCollisionGroup, shellCollisionGroup, urchinCollisionGroup]));
			food.scale.setTo(0.5, 0.5);
		}

		this.urchinGroup = this.game.add.group();
		this.urchinGroup.enableBody = true;
		this.urchinGroup.physicsBodyType = Phaser.Physics.P2JS;

		for (let i = 0; i < urchinCount; i++) {
			var urchin = this.urchinGroup.create(this.game.world.randomX, this.game.world.randomY, 'urchin');
			urchin.body.setRectangle(30, 30);
			urchin.body.setCollisionGroup(urchinCollisionGroup);
			urchin.body.collides(this.armsCollisionGroups.concat([foodCollisionGroup, shellCollisionGroup, urchinCollisionGroup]));
			urchin.scale.setTo(0.75, 0.75);
		}

		// Don't really need to worry about shells after creation

		var shellGroup = this.game.add.group();
		shellGroup.enableBody = true;
		shellGroup.physicsBodyType = Phaser.Physics.P2JS;

		for (let i = 0; i < shellCount; i++) {
			var shell = shellGroup.create(this.game.world.randomX, this.game.world.randomY, 'shell');
			shell.body.setRectangle(40, 40);
			shell.body.setCollisionGroup(shellCollisionGroup);
			shell.body.collides([foodCollisionGroup, shellCollisionGroup, mouthCollisionGroup, urchinCollisionGroup].concat(this.armsCollisionGroups));
		}

		window["game"] = this;
	}

	update() {
		function anglise(tip: Phaser.Sprite, direction: number, force: number) {
			let rotation = tip.rotation + direction;
			tip.body.force.x = Math.cos(rotation) * force;
			tip.body.force.y = Math.sin(rotation) * force;
			// console.log(tip.body.force.x);
		}

		function forceBody(tip: Phaser.Sprite, keys, forceAmt) {

			if (keys.left.isDown) {
				anglise(tip, 0, forceAmt);
			}
			else if (keys.right.isDown) {
				anglise(tip, Math.PI, forceAmt);
			}

			if (keys.up.isDown) {
				anglise(tip, Math.PI / 2, forceAmt * MOTION_FORCE)
			}
			else if (keys.down.isDown) {
				anglise(tip, Math.PI * 3 / 2, forceAmt * MOTION_FORCE)
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