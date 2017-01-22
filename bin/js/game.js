var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var armColors = [
    0x00B4FF,
    0x22B573,
    0x9329FF
];
var Arm = (function () {
    function Arm(game, armIndex, startX, startY) {
        var _this = this;
        this.armIndex = armIndex;
        this.game = game;
        this.balls = [];
        this.springs = [];
        this.hinges = [];
        this.sprite = new Phaser.Group(this.game);
        var angle = Math.PI * 2 * (armIndex / armsTotal);
        var segmentLength = 15;
        var totalMass = 1;
        var segmentCount = 15;
        var tintColor = armColors[armIndex % armColors.length];
        for (var i = 0; i < segmentCount; i++) {
            var x = Math.cos(angle) * i * segmentLength + startX;
            var y = Math.sin(angle) * i * segmentLength + startY;
            var ball = this.game.add.sprite(x, y, "segment");
            ball.tint = Phaser.Color.interpolateColor(0xffffff, tintColor, segmentCount, i);
            ball.scale.set(0.4 / (1 + (i / (segmentCount - 1)) * 1.5));
            this.balls.push(ball);
        }
        this.game.physics.p2.enable(this.balls, SHOW_PHYSICS_DEBUG);
        this.tip = this.balls[this.balls.length - 1];
        var lastBall = null;
        this.balls.forEach(function (b) {
            b.body.mass = totalMass / segmentCount;
            b.body.collideWorldBounds = true;
            b.body.setCircle(b.width / 2, 0, 0, -angle);
            if (lastBall) {
                var hinge = _this.game.physics.p2.createRevoluteConstraint(b, [0, 0], lastBall, [0, segmentLength], //[ b.x - lastBall.x, b.y - lastBall.y ],
                maxForce);
                hinge.setStiffness(tweaks.armLengthStiffness);
                hinge.setRelaxation(tweaks.armLengthRelaxation);
                _this.hinges.push(hinge);
                var spring = _this.game.physics.p2.createRotationalSpring(b, lastBall, 0, tweaks.stiffness, tweaks.damping);
                _this.springs.push(spring);
            }
            lastBall = b;
        });
        stiffness.addListener(function (value) {
            _this.springs.forEach(function (s) {
                s.data.stiffness = value;
            });
        });
        damping.addListener(function (value) {
            _this.springs.forEach(function (s) {
                s.data.damping = value;
            });
        });
        armLengthStiffness.addListener(function (value) {
            _this.hinges.forEach(function (h) {
                h.setStiffness(value);
            });
        });
        armLengthRelaxation.addListener(function (value) {
            _this.hinges.forEach(function (h) {
                h.setRelaxation(value);
            });
        });
        this.tip.body.force.x = Math.random() - 0.5 * 2000;
        this.tip.body.force.y = Math.random() - 0.5 * 2000;
    }
    Arm.prototype.getBase = function () {
        return this.balls[0].body;
    };
    Arm.prototype.update = function () {
        var _this = this;
        var now = this.game.time.now / 1000;
        this.springs.forEach(function (s) {
            // Flex the arm slowly and gently, and out of sync with the other arms
            s.data.restAngle = Math.sin(2 * Math.PI * now * (0.1 + _this.armIndex * 0.047)) * 0.05;
        });
    };
    Arm.prototype.attachTo = function (body, rotation) {
        //this.game.physics.p2.createLockConstraint(body, this.getBase()); // a lock seems to work slightly better than the revolute
        this.game.physics.p2.createRevoluteConstraint(body, [0, 0], this.getBase(), [0, -50], maxForce);
        var USELESS = 0; // setting rest rotation in constructor doesn't work properly for some mysterious reason
        var rotationSpring = this.game.physics.p2.createRotationalSpring(body, this.getBase(), USELESS, 120, 5);
        rotationSpring.data.restAngle = rotation;
    };
    return Arm;
}());
Arm.armIdCounter = 0;
var Crab = (function () {
    function Crab(game, x, y, player) {
        this.game = game;
        this.player = player;
        this.speed = 8;
        this.base = this.game.add.sprite(x, y, "urchin");
        this.base.scale.set(1.0);
        this.game.physics.p2.enable([this.base], SHOW_PHYSICS_DEBUG);
        this.base.body.setCircle(this.base.width / 2 * 0.8, 0, 0, 0);
    }
    Crab.prototype.attach = function (parent) {
        console.log("wow made an eyeball, attached " + this.base.position.toString());
        parent.addChild(this.base);
    };
    Crab.prototype.update = function () {
        var angle = Math.atan2(this.player.y - this.base.y, this.player.x - this.base.x);
        this.base.body.rotation = angle; // correct angle of angry bullets (depends on the sprite used)
        this.base.body.force.x = Math.cos(angle) * this.speed; // accelerateToObject 
        this.base.body.force.y = Math.sin(angle) * this.speed;
    };
    return Crab;
}());
var PlayerEnergy = (function () {
    function PlayerEnergy(game, max) {
        this.maxEnergy = max;
        this.currentEngery = this.maxEnergy;
        this.sprite = game.add.sprite(10, 10, 'energy');
        this.sprite.fixedToCamera = true;
    }
    PlayerEnergy.prototype.increaeEnergy = function (amount) {
        if (this.currentEngery < this.maxEnergy) {
            this.currentEngery += amount;
            this.sprite.scale.setTo(this.currentEngery / this.maxEnergy, 1);
        }
    };
    PlayerEnergy.prototype.decreaseEnergy = function (amount) {
        if (this.currentEngery > 0) {
            this.currentEngery -= amount;
            this.sprite.scale.setTo(this.currentEngery / this.maxEnergy, 1);
        }
    };
    return PlayerEnergy;
}());
var Eye = (function () {
    function Eye(game, x, y) {
        this.game = game;
        this.offset = Math.random() * 10000;
        this.base = this.game.add.image(x, y, "eyeball-base");
        this.iris = this.game.make.image(this.base.width / 2, this.base.height / 2, "eyeball-iris");
        this.highlight = this.game.make.image(0, 0, "eyeball-highlight");
        setPivotCenter(this.base);
        setPivotCenter(this.iris);
        // setPivotCenter(this.highlight);
        this.highlight.position.set(0);
        // adding these children causes mayhem...
        this.base.addChild(this.iris);
        this.base.addChild(this.highlight);
    }
    Eye.prototype.attach = function (parent) {
        console.log("wow made an eyeball, attached " + this.base.position.toString());
        parent.addChild(this.base);
    };
    Eye.prototype.update = function () {
        var now = this.game.time.now;
        var xoffset = this.base.width / 2;
        var yoffset = this.base.height / 2;
        this.iris.position.set(Math.sin(2 * Math.PI * (now + this.offset) / 1000 * 0.2) * 5 + xoffset, Math.cos(2 * Math.PI * (now + this.offset) / 1000 * 0.17) * 5 + yoffset);
        this.base.rotation = -this.base.parent.rotation;
    };
    return Eye;
}());
var Food = (function () {
    function Food(game, spriteName, collisionGroups) {
        // var food = allFood.create(this.game.world.randomX, this.game.world.randomY, 'food');
        // food.body.setRectangle(40, 40);
        // food.body.setCollisionGroup(foodCollisionGroup);
        // food.body.collides([foodCollisionGroup, starfishCollisionGroup]);
    }
    return Food;
}());
var FoodGroup = (function () {
    function FoodGroup(game) {
        this.group = game.add.group();
        this.group.enableBody = true;
        this.group.physicsBodyType = Phaser.Physics.P2JS;
    }
    return FoodGroup;
}());
/// <reference path="../tsd/phaser.d.ts"/>
var maxForce = 2000; // who knows
var SHOW_PHYSICS_DEBUG = false;
var MOTION_FORCE = 2;
var RECOIL_FORCE = 20;
var RECOIL_DURATION_MS = 150;
var gui = new dat.GUI();
var armsTotal = 3;
var foodCount = 100;
var urchinCount = 5;
var shellCount = 7;
var maxFoodToWin = 3;
var tweaks = {
    stiffness: 30,
    damping: 500,
    playerBodyMass: 10,
    mouthMass: 5,
    tentacleForce: 140,
    armLengthStiffness: 40,
    armLengthRelaxation: 30,
    cameraScale: 1
};
function extendGuiParameterToSupportMultipleListeners(guiParam) {
    guiParam.___changeCallbacks___ = [];
    guiParam.addListener = (function (callback) {
        this.___changeCallbacks___.push(callback);
    }).bind(guiParam);
    guiParam.onChange((function (val) {
        this.___changeCallbacks___.forEach(function (cb) { return cb(val); });
    }).bind(guiParam));
}
var stiffness = gui.add(tweaks, 'stiffness', 1, 50);
extendGuiParameterToSupportMultipleListeners(stiffness);
var damping = gui.add(tweaks, 'damping', 1, 500);
extendGuiParameterToSupportMultipleListeners(damping);
var mouthMass = gui.add(tweaks, 'mouthMass', 1, 100);
var tentacleForce = gui.add(tweaks, 'tentacleForce', 10, 500);
var armLengthStiffness = gui.add(tweaks, 'armLengthStiffness', 1, 50);
extendGuiParameterToSupportMultipleListeners(armLengthStiffness);
var armLengthRelaxation = gui.add(tweaks, 'armLengthRelaxation', 1, 50);
extendGuiParameterToSupportMultipleListeners(armLengthRelaxation);
var cameraScale = gui.add(tweaks, 'cameraScale', 0.5, 3);
function setPivotCenter(image) {
    image.pivot.set(image.width / 2, image.height / 2);
}
var SimpleGame = (function () {
    function SimpleGame() {
        this.keyList = [];
        this.game = new Phaser.Game(640, 480, Phaser.AUTO, 'content', {
            create: this.create, preload: this.preload, update: this.update
        });
    }
    SimpleGame.prototype.preload = function () {
        this.game.load.image('background', 'assets/background-tile.png'); // assets/background-tile-space-theme.png
        this.game.load.image('segment', 'assets/ball.png');
        this.game.load.image('eyeball-base', 'assets/eyeball-base.png');
        this.game.load.image('eyeball-iris', 'assets/eyeball-iris.png');
        this.game.load.image('eyeball-highlight', 'assets/eyeball-highlight.png');
        this.game.load.image('mouth-closed', 'assets/mouth-closed.png');
        this.game.load.image('mouth-bite0', 'assets/mouth-bite0.png');
        this.game.load.image('mouth-bite1', 'assets/mouth-bite1.png');
        this.game.load.image('mouth-bite2', 'assets/mouth-bite2.png');
        this.game.load.image('food', 'assets/boigah.png');
        this.game.load.image('shell', 'assets/shell.png');
        this.game.load.image('energy', 'assets/energy.gif');
        this.game.load.image('urchin', 'assets/urchin.png');
        this.game.load.image('doodad01', 'assets/background-doodad-01.png');
        this.game.load.image('doodad02', 'assets/background-doodad-02.png');
        this.game.load.image('doodad03', 'assets/background-doodad-03.png');
        this.game.load.image('doodad04', 'assets/background-doodad-04.png');
        this.game.load.image('doodad05', 'assets/background-doodad-05.png');
        this.game.load.image('doodad06', 'assets/background-doodad-06.png');
        this.game.load.image('doodad07', 'assets/background-doodad-07.png');
        this.game.load.image('doodad08', 'assets/background-doodad-08.png');
        this.game.load.spritesheet('mouth', 'assets/mouth-spritesheet.png', 87, 91);
        this.game.load.image('title', 'assets/title.png');
    };
    SimpleGame.prototype.create = function () {
        var _this = this;
        this.game.add.tileSprite(0, 0, 1920, 1920, 'background');
        this.game.world.setBounds(0, 0, 1920, 1920);
        console.log(this.game.world.centerX, this.game.world.centerY);
        var spawnOffset = 200;
        this.mouthGod = this.game.add.sprite(spawnOffset, spawnOffset, 'mouth', 1);
        this.mouthGod.scale.set(2);
        this.mouthGodEatAnimation = this.mouthGod.animations.add('eat');
        var playerBodyScale = 0.65;
        this.playerBody = this.game.add.sprite(this.mouthGod.x + spawnOffset, this.mouthGod.y + spawnOffset, "segment");
        this.playerBody.scale.set(playerBodyScale);
        this.foodEatenCount = 0;
        //add eyes
        // const eyeDistance = 1;
        // this.eyes = [];
        // for (var i = 0; i < 3; i++) {
        // 	// i eye captain
        // 	let x = Math.sin(2 * Math.PI * (i / 3) + 2 * Math.PI / 6) * eyeDistance;
        // 	let y = Math.cos(2 * Math.PI * (i / 3) + 2 * Math.PI / 6) * eyeDistance;
        // 	console.log(`eye ${i}, ${x}:${y}`);
        // 	let eye = new Eye(this.game, x, y);
        // 	eye.attach(this.mouthGod);
        // 	this.eyes.push(eye);
        // }
        // add mouth-lips
        // this.mouthLips = this.game.make.image(0, 0, "mouth-bite1");
        // setPivotCenter(this.mouthLips);
        // this.mouthGod.addChild(this.mouthLips);
        // window["mouth"] = this.mouthLips; // for in-browser debug
        // window["eyes"] = this.eyes;  // for in-browser debug
        this.game.physics.startSystem(Phaser.Physics.P2JS);
        this.game.camera.follow(this.playerBody);
        cameraScale.onChange(function (scale) {
            _this.game.camera.scale.setTo(scale);
        });
        // Enabled physics on mouth
        this.game.physics.p2.enable([this.playerBody, this.mouthGod], SHOW_PHYSICS_DEBUG);
        this.game.physics.p2.setImpactEvents(true);
        // setup behaviour of individual bits
        this.playerBody.body.mass = tweaks.playerBodyMass;
        this.playerBody.body.setCircle(this.playerBody.width * playerBodyScale);
        this.mouthGod.body.mass = 1000;
        ;
        // this.mouthGod.body.setRectangle(this.mouthGod.width * 2, 90 * 2);
        this.mouthGod.body.immovable = true;
        this.mouthGod.body.moves = false;
        // mouthMass.onChange(value => this.playerBody.body.mass = value);
        this.keyList = [];
        var setupCursors = function () {
            _this.keyList[0] = _this.game.input.keyboard.createCursorKeys();
            _this.keyList[1] = {
                left: _this.game.input.keyboard.addKey(Phaser.Keyboard.A),
                right: _this.game.input.keyboard.addKey(Phaser.Keyboard.D),
                up: _this.game.input.keyboard.addKey(Phaser.Keyboard.W),
                down: _this.game.input.keyboard.addKey(Phaser.Keyboard.S),
            };
            _this.keyList[2] = {
                left: _this.game.input.keyboard.addKey(Phaser.Keyboard.J),
                right: _this.game.input.keyboard.addKey(Phaser.Keyboard.L),
                up: _this.game.input.keyboard.addKey(Phaser.Keyboard.I),
                down: _this.game.input.keyboard.addKey(Phaser.Keyboard.K),
            };
            _this.keyList[3] = {
                left: _this.game.input.keyboard.addKey(Phaser.Keyboard.F),
                right: _this.game.input.keyboard.addKey(Phaser.Keyboard.H),
                up: _this.game.input.keyboard.addKey(Phaser.Keyboard.T),
                down: _this.game.input.keyboard.addKey(Phaser.Keyboard.G),
            };
            _this.keyList[4] = {
                left: _this.game.input.keyboard.addKey(Phaser.Keyboard.Z),
                right: _this.game.input.keyboard.addKey(Phaser.Keyboard.V),
                up: _this.game.input.keyboard.addKey(Phaser.Keyboard.X),
                down: _this.game.input.keyboard.addKey(Phaser.Keyboard.C),
            };
        };
        setupCursors();
        // Collision groups
        var foodCollisionGroup = this.game.physics.p2.createCollisionGroup();
        var shellCollisionGroup = this.game.physics.p2.createCollisionGroup();
        var urchinCollisionGroup = this.game.physics.p2.createCollisionGroup();
        var playerBodyCollisionGroup = this.game.physics.p2.createCollisionGroup();
        this.armsCollisionGroups = [];
        this.mouthCoillisionGroup = this.game.physics.p2.createCollisionGroup();
        this.game.physics.p2.updateBoundsCollisionGroup();
        for (var i_1 = 0; i_1 < armsTotal; i_1++) {
            this.armsCollisionGroups.push(this.game.physics.p2.createCollisionGroup());
        }
        //Enemy
        this.crab = new Crab(this.game, this.game.world.centerX - 200, this.game.world.centerY - 200, this.playerBody);
        this.crab.base.body.setCollisionGroup(urchinCollisionGroup);
        this.crab.base.body.collides(this.armsCollisionGroups.concat([foodCollisionGroup, shellCollisionGroup, urchinCollisionGroup]));
        var foodHitMouth = function (playerBody, foodBody) {
            var sprite = foodBody.sprite;
            _this.mouthGodEatAnimation.stop();
            _this.mouthGodEatAnimation.play(18);
            sprite.kill();
            if (sprite.group) {
                sprite.group.remove(sprite);
            }
            else if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            foodBody.destroy();
            _this.foodEatenCount++;
        };
        this.urchinReaction = false;
        var urchinHitPlayer = function (playerBody, urchinBody) {
            _this.urchinReaction = true;
            setTimeout(function () {
                _this.urchinReaction = false;
            }, RECOIL_DURATION_MS);
        };
        var createNoodlyAppendage = function (armIndex) {
            var arm = new Arm(_this.game, armIndex, _this.playerBody.x, _this.playerBody.y);
            _this.game.world.add(arm.sprite);
            var appendageRotation = 2 * Math.PI * (armIndex / armsTotal);
            arm.attachTo(_this.playerBody.body, appendageRotation);
            return arm;
        };
        this.armList = [];
        var _loop_1 = function (a) {
            this_1.armList[a] = createNoodlyAppendage(a);
            this_1.armList[a].balls.forEach(function (ball) {
                ball.body.setCollisionGroup(_this.armsCollisionGroups[a]);
                ball.body.collides([foodCollisionGroup, shellCollisionGroup]);
                ball.body.collides(urchinCollisionGroup, urchinHitPlayer);
                for (var i_2 = 0; i_2 < armsTotal; i_2++) {
                    if (i_2 != a) {
                        ball.body.collides(_this.armsCollisionGroups[i_2]);
                    }
                }
            });
        };
        var this_1 = this;
        for (var a = 0; a < armsTotal; ++a) {
            _loop_1(a);
        }
        var randomDoodad = function () {
            return "doodad0" + (Math.floor(Math.random() * 8) + 1);
        };
        for (var i = 0; i < 20; i++) {
            this.game.add.image(this.game.world.randomX, this.game.world.randomY, randomDoodad());
        }
        this.playerBody.body.setCollisionGroup(playerBodyCollisionGroup);
        this.playerBody.body.collides([foodCollisionGroup, shellCollisionGroup]);
        this.playerBody.body.collides(urchinCollisionGroup, urchinHitPlayer);
        this.mouthGod.body.setCollisionGroup(this.mouthCoillisionGroup);
        this.mouthGod.body.collides([shellCollisionGroup, urchinCollisionGroup]);
        this.mouthGod.body.collides(foodCollisionGroup, foodHitMouth);
        this.allFood = this.game.add.group();
        this.allFood.enableBody = true;
        this.allFood.physicsBodyType = Phaser.Physics.P2JS;
        for (var i = 0; i < foodCount; i++) {
            var food = this.allFood.create(this.game.world.randomX, this.game.world.randomY, 'food');
            food.scale.setTo(0.2, 0.2);
            food.body.setCircle(food.width / 2 * 0.8, 0, 0, 0);
            food.body.setCollisionGroup(foodCollisionGroup);
            food.body.collides(this.armsCollisionGroups.concat([foodCollisionGroup, shellCollisionGroup, urchinCollisionGroup, this.mouthCoillisionGroup]));
        }
        this.urchinGroup = this.game.add.group();
        this.urchinGroup.enableBody = true;
        this.urchinGroup.physicsBodyType = Phaser.Physics.P2JS;
        for (var i_3 = 0; i_3 < urchinCount; i_3++) {
            var urchin = this.urchinGroup.create(this.game.world.randomX, this.game.world.randomY, 'urchin');
            urchin.scale.setTo(0.2);
            urchin.body.setCircle(urchin.width / 2 * 0.8, 0, 0, 0);
            urchin.body.setCollisionGroup(urchinCollisionGroup);
            urchin.body.collides(this.armsCollisionGroups.concat([foodCollisionGroup, shellCollisionGroup, urchinCollisionGroup, this.mouthCoillisionGroup]));
        }
        // Don't really need to worry about shells after creation
        var shellGroup = this.game.add.group();
        shellGroup.enableBody = true;
        shellGroup.physicsBodyType = Phaser.Physics.P2JS;
        for (var i_4 = 0; i_4 < shellCount; i_4++) {
            var shell = shellGroup.create(this.game.world.randomX, this.game.world.randomY, 'shell');
            shell.scale.setTo(0.55);
            shell.body.setCircle(shell.width / 2 * 0.8, 0, 0, 0);
            shell.body.setCollisionGroup(shellCollisionGroup);
            shell.body.collides([foodCollisionGroup, shellCollisionGroup, playerBodyCollisionGroup, urchinCollisionGroup, this.mouthCoillisionGroup].concat(this.armsCollisionGroups));
        }
        // TITLESCREEN
        this.title = this.game.add.sprite(this.game.width / 2, this.game.height / 2, "title");
        this.title.pivot.set(this.title.width / 2, this.title.height / 2);
        this.title.scale.set(0.8);
        this.title.fixedToCamera = true;
        // Sort out z-index of important items
        this.playerBody.bringToTop();
        this.title.bringToTop();
        window["game"] = this;
    };
    SimpleGame.prototype.update = function () {
        var _this = this;
        // Hide title screen after a while
        // Feel free to delete this or move it somewhere else somehow
        if (this.title && this.game.time.now > 1000) {
            this.title.alpha -= 0.05;
            if (this.title.alpha < 0) {
                this.game.world.removeChild(this.title);
            }
        }
        if (this.foodEatenCount >= maxFoodToWin) {
            console.log("You have won");
        }
        function anglise(tip, direction, force) {
            var rotation = tip.rotation + direction;
            var x = Math.cos(rotation) * force;
            var y = Math.sin(rotation) * force;
            return new Phaser.Point(x, y);
        }
        var forceBody = function (tip, keys, forceAmt) {
            var xForce = 0;
            var yForce = 0;
            if (keys.left.isDown) {
                var result = anglise(tip, 0, forceAmt);
                xForce += result.x;
                yForce += result.y;
            }
            if (keys.right.isDown) {
                var result = anglise(tip, Math.PI, forceAmt);
                xForce += result.x;
                yForce += result.y;
            }
            if (keys.up.isDown) {
                var result = anglise(tip, Math.PI / 2, forceAmt * MOTION_FORCE);
                xForce += result.x;
                yForce += result.y;
            }
            if (keys.down.isDown) {
                var result = anglise(tip, Math.PI * 3 / 2, forceAmt * MOTION_FORCE);
                xForce += result.x;
                yForce += result.y;
            }
            if (_this.urchinReaction) {
                console.log("recoilin");
                var result = anglise(tip, Math.PI * 3 / 2, forceAmt * RECOIL_FORCE);
                xForce += result.x;
                yForce += result.y;
            }
            tip.body.force.x = xForce;
            tip.body.force.y = yForce;
        };
        for (var a = 0; a < armsTotal; ++a) {
            forceBody(this.armList[a].tip, this.keyList[a], tweaks.tentacleForce);
        }
        // this.mouthLips.rotation = -this.mouthLips.parent.rotation; // always up
        // this.eyes.forEach(e => e.update());
        this.armList.forEach(function (arm) { return arm.update(); });
        this.crab.update();
        if (this.mouthGodEatAnimation.isFinished) {
            this.mouthGodEatAnimation.play(1);
        }
    };
    return SimpleGame;
}());
window.onload = function () {
    var game = new SimpleGame();
};
function armDraw() {
    var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { create: create });
    function create() {
        var graphics = game.add.graphics(100, 100);
        var length = 100;
        var total = 5;
        for (var count = 0; count < total; ++count) {
            graphics.lineStyle(5, 0x33FF00);
            graphics.moveTo(0, 0);
            var angle = Math.PI * 2 * (count / total);
            var x = Math.cos(angle) * length;
            var y = Math.sin(angle) * length;
            //	console.log(x,y, angle);
            graphics.lineTo(x, y);
        }
    }
}
var MyGame;
(function (MyGame) {
    var BootState = (function (_super) {
        __extends(BootState, _super);
        function BootState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        BootState.prototype.preload = function () { };
        BootState.prototype.create = function () {
            // Use this if you don't need multitouch
            this.input.maxPointers = 1;
            if (this.game.device.desktop) {
            }
            this.game.state.start('Preloader', true, false);
        };
        return BootState;
    }(Phaser.State));
    MyGame.BootState = BootState;
})(MyGame || (MyGame = {}));
var MyGame;
(function (MyGame) {
    var GameState = (function (_super) {
        __extends(GameState, _super);
        function GameState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GameState.prototype.preload = function () { };
        GameState.prototype.create = function () {
            var logo = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, 'logo');
            logo.anchor.setTo(0.5, 0.5);
        };
        return GameState;
    }(Phaser.State));
    MyGame.GameState = GameState;
})(MyGame || (MyGame = {}));
var MyGame;
(function (MyGame) {
    var PreloaderState = (function (_super) {
        __extends(PreloaderState, _super);
        function PreloaderState() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PreloaderState.prototype.preload = function () {
            this.game.load.image('logo', 'assets/logo.png');
        };
        PreloaderState.prototype.create = function () {
            this.game.state.start('Game');
        };
        return PreloaderState;
    }(Phaser.State));
    MyGame.PreloaderState = PreloaderState;
})(MyGame || (MyGame = {}));
//# sourceMappingURL=game.js.map