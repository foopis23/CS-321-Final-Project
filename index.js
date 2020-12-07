const π = Math.PI;

var scene, rootElement, canvasElement, renderer, camera, controls, clock, physicsWorld, rigidBodies = [], tmpTrans, treeMaterials = [];

function bind(scope, fn) {

	return function () {

		fn.apply(scope, arguments);

	};

}

class FirstPersonControls {

	constructor(player, camera, domElement) {
		//dep
		this.camera = camera;
		this.player = player;
		this.domElement = domElement;

		//properties
		this.enabled = true;

		this.movementSpeed = 1.0;
		this.lookSpeed = 0.005;

		this.lookVertical = true;
		this.autoForward = false;

		this.activeLook = true;

		this.heightSpeed = false;
		this.heightCoef = 1.0;
		this.heightMin = 0.0;
		this.heightMax = 1.0;

		this.constrainVertical = false;
		this.verticalMin = 0;
		this.verticalMax = Math.PI;

		this.mouseDragOn = false;

		//internal
		this.autoSpeedFactor = 0.0;

		this.mouseX = 0;
		this.mouseY = 0;

		this.moveForward = false;
		this.moveBackward = false;
		this.moveLeft = false;
		this.moveRight = false;

		this.viewHalfX = 0;
		this.viewHalfY = 0;

		this.lat = 0;
		this.lon = 0;

		this.lookDirection = new THREE.Vector3();
		this.spherical = new THREE.Spherical();
		this.target = new THREE.Vector3();

		//event stuff
		this.domElement.requestPointerLock = this.domElement.requestPointerLock || this.domElement.mozRequestPointerLock;

		document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

		this._onLockChangeAlert = bind(this, this.onLockChangeAlert);
		this._onMouseDown = bind(this, this.onMouseDown);
		this._onMouseUp = bind(this, this.onMouseUp);
		this._onKeyDown = bind(this, this.onKeyDown);
		this._onKeyUp = bind(this, this.onKeyUp);
		this._onMouseMove = bind(this, this.onMouseMove);

		document.addEventListener('pointerlockchange', this._onLockChangeAlert, false);
		document.addEventListener('mozpointerlockchange', this._onLockChangeAlert, false);
		this.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
		this.domElement.addEventListener('mousedown', this._onMouseDown, false);
		this.domElement.addEventListener('mouseup', this._onMouseUp, false);
		window.addEventListener('keydown', this._onKeyDown, false);
		window.addEventListener('keyup', this._onKeyUp, false);

		this.handleResize();
		window.focus();
		this.domElement.requestPointerLock();
	}

	onLockChangeAlert() {
		

		if (document.pointerLockElement === this.domElement ||
			document.mozPointerLockElement === this.domElement) {
			this.domElement.addEventListener('mousemove', this._onMouseMove, false);
		} else {
			this.domElement.removeEventListener('mousemove', this._onMouseMove, false);
		}
	}

	handleResize() {
		if (this.domElement === document) {

			this.viewHalfX = window.innerWidth / 2;
			this.viewHalfY = window.innerHeight / 2;

		} else {

			this.viewHalfX = this.domElement.offsetWidth / 2;
			this.viewHalfY = this.domElement.offsetHeight / 2;

		}
	}

	onMouseMove(event) {
		this.mouseX += event.movementX;
		this.mouseY += event.movementY;

		// if (this.domElement === document) {

		// 	this.mouseX = event.pageX - this.viewHalfX;
		// 	this.mouseY = event.pageY - this.viewHalfY;

		// } else {

		// 	this.mouseX = event.pageX - this.domElement.offsetLeft - this.viewHalfX;
		// 	this.mouseY = event.pageY - this.domElement.offsetTop - this.viewHalfY;
		// }
	}

	onMouseDown(event) {

	}

	onMouseUp(event) {
		window.focus();
		this.domElement.requestPointerLock();
	}

	onKeyDown(event) {
		console.log("test");
		switch (event.keyCode) {

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = true; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = true; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = true; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = true; break;

		}
	}

	onKeyUp(event) {
		switch (event.keyCode) {

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = false; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = false; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = false; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = false; break;

		}
	}

	lookAt(x, y, z) {

		if (x.isVector3) {
			this.target.copy(x);
		} else {
			this.target.set(x, y, z);
		}

		this.camera.lookAt(this.target);
		this.setOrientation(this);

		return this;
	};

	update(delta) {
		if (this.enabled === false) return;

		let objAmmo = this.player.userData.physicsBody;
		let velocity = objAmmo.getLinearVelocity();
		let angularVelocity = objAmmo.getAngularVelocity();

		var lookAtVector = new THREE.Vector3(0, 0, -1);
		lookAtVector.applyQuaternion(this.camera.quaternion);

		velocity.setX(0);
		velocity.setZ(0);
		angularVelocity.setY(0);

		if (this.moveForward || (this.autoForward && !this.moveBackward)) {
			velocity.setZ(this.movementSpeed * lookAtVector.z);
			velocity.setX(this.movementSpeed * lookAtVector.x);
		}

		if (this.moveBackward) {
			velocity.setZ(-this.movementSpeed * lookAtVector.z);
			velocity.setX(-this.movementSpeed * lookAtVector.x);
		}

		// if ( this.moveLeft ) {
		// 	velocity.setZ(this.movementSpeed * lookAtVector.x);
		// 	velocity.setX(this.movementSpeed * lookAtVector.z);
		// } 

		// if ( this.moveRight ) {
		// 	velocity.setZ(-this.movementSpeed * lookAtVector.x);
		// 	velocity.setX(-this.movementSpeed * lookAtVector.z);
		// }

		var actualLookSpeed = delta * this.lookSpeed;

		if (!this.activeLook) {

			actualLookSpeed = 0;
		}

		var verticalLookRatio = 1;

		if (this.constrainVertical) {

			verticalLookRatio = Math.PI / (this.verticalMax - this.verticalMin);

		}

		this.lon -= this.mouseX * actualLookSpeed;
		if (this.lookVertical) this.lat -= this.mouseY * actualLookSpeed * verticalLookRatio;

		this.lat = Math.max(- 85, Math.min(85, this.lat));

		var phi = THREE.MathUtils.degToRad(90 - this.lat);
		var theta = THREE.MathUtils.degToRad(this.lon);

		if (this.constrainVertical) {

			phi = THREE.MathUtils.mapLinear(phi, 0, Math.PI, this.verticalMin, this.verticalMax);

		}

		var position = new THREE.Vector3();
		this.camera.getWorldPosition(position);
		var targetPosition = new THREE.Vector3();
		targetPosition.setFromSphericalCoords(1, phi, theta).add(position);
		this.camera.lookAt(targetPosition);
		this.camera.updateMatrixWorld();

		this.mouseX = 0;
		this.mouseY = 0;
	}

	dipose() {
		document.removeEventListener('pointerlockchange', this._onLockChangeAlert, false);
		document.removeEventListener('mozpointerlockchange', this._onLockChangeAlert, false);
		this.domElement.removeEventListener('mousedown', this._onMouseDown, false);
		this.domElement.removeEventListener('mousemove', this._onMouseMove, false);
		this.domElement.removeEventListener('mouseup', this._onMouseUp, false);
		window.removeEventListener('keydown', this._onKeyDown, false);
		window.removeEventListener('keyup', this._onKeyUp, false);
	}

	setOrientation(controls) {
		var quaternion = controls.camera.quaternion;
		this.lookDirection.set(0, 0, - 1).applyQuaternion(quaternion);
		this.spherical.setFromVector3(this.lookDirection);
		this.lat = 90 - THREE.MathUtils.radToDeg(this.spherical.phi);
		this.lon = THREE.MathUtils.radToDeg(this.spherical.theta);
	}
}


function ToEulerAngles(q) {
	let angles = { x: 0, y: 0, z: 0 };

	// roll (x-axis rotation)
	let sinr_cosp = 2 * (q.w() * q.x() + q.y() * q.z());
	let cosr_cosp = 1 - 2 * (q.x() * q.x() + q.y() * q.y());
	angles.x = Math.atan2(sinr_cosp, cosr_cosp);

	// pitch (y-axis rotation)
	let sinp = 2 * (q.w() * q.y() - q.z() * q.x());
	if (Math.abs(sinp) >= 1)
		angles.y = (M_PI / 2) * Math.sign(sinp); // use 90 degrees if out of range
	else
		angles.y = Math.asin(sinp);

	// yaw (z-axis rotation)
	let siny_cosp = 2 * (q.w() * q.z() + q.x() * q.y());
	let cosy_cosp = 1 - 2 * (q.y() * q.y() + q.z() * q.z());
	angles.z = Math.atan2(siny_cosp, cosy_cosp);

	return angles;
}

function createPlayer() {
	let pos = { x: 0, y: 20, z: 0 };
	let radius = 1.5;
	let quat = { x: 0, y: 0, z: 0, w: 1 };
	let mass = 1;

	//threeJS Section
	let playerWrapper = new THREE.Object3D();
	let fov = 75;
	let aspect = 2;  // the canvas default
	let near = 0.1;
	let far = 500;
	camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	playerWrapper.add(camera);
	camera.position.set(0, 0, 0);
	playerWrapper.position.set(pos.x, pos.y, pos.z);
	playerWrapper.updateMatrixWorld();
	controls = new FirstPersonControls(playerWrapper, camera, canvasElement);
	controls.movementSpeed = 5;
	controls.lookSpeed = 10;
	scene.add(playerWrapper);

	//Ammojs Section
	let transform = new Ammo.btTransform();
	transform.setIdentity();
	transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
	transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
	let motionState = new Ammo.btDefaultMotionState(transform);

	let colShape = new Ammo.btSphereShape(radius);
	colShape.setMargin(0.05);

	let localInertia = new Ammo.btVector3(0, 0, 0);
	colShape.calculateLocalInertia(mass, localInertia);

	let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
	let body = new Ammo.btRigidBody(rbInfo);

	body.setAngularFactor(0, 1, 0)

	physicsWorld.addRigidBody(body);

	playerWrapper.userData.physicsBody = body;
	rigidBodies.push(playerWrapper);
}

function createFloor() {
	let pos = { x: 0, y: -2, z: 0 };
	let scale = { x: 250, y: 1, z: 250 };
	let quat = { x: 0, y: 0, z: 0, w: 1 };
	let mass = 0;

	//threeJS Section
	let blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({ color: 0x999999 }));

	blockPlane.position.set(pos.x, pos.y, pos.z);
	blockPlane.scale.set(scale.x, scale.y, scale.z);

	blockPlane.castShadow = true;
	blockPlane.receiveShadow = true;

	scene.add(blockPlane);


	//Ammojs Section
	let transform = new Ammo.btTransform();
	transform.setIdentity();
	transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
	transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
	let motionState = new Ammo.btDefaultMotionState(transform);

	let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
	colShape.setMargin(0.05);

	let localInertia = new Ammo.btVector3(0, 0, 0);
	colShape.calculateLocalInertia(mass, localInertia);

	let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
	let body = new Ammo.btRigidBody(rbInfo);


	physicsWorld.addRigidBody(body);
}

function generateTrees(object) {
	const mapWidth = 250;
	const mapDepth = 250;
	const treeDensity = 0.2;
	const posVariation = 1;
	const scaleVariation = 0.2;
	const trunkVariation = 0.1;
	const treeDistance = 3;

	let mapWidthH = mapWidth/2;
	let mapDepthH = mapDepth/2;
	for (let x = -mapWidthH; x < mapWidthH; x += treeDistance) {
		for (let z = -mapDepthH; z < mapDepthH; z += treeDistance) {
			if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;

			if (Math.random() < treeDensity) {
				//threejs stuff
				let newObj = object.clone(true);

				let posX = x + Math.random() * (posVariation * 2) - posVariation;
				let posY = -2 + Math.random() * (trunkVariation * 2) - trunkVariation
				let posZ = z + Math.random() * (posVariation * 2) - posVariation;
				
				let scaleY = scaleVariation + Math.random() * (scaleVariation * 2) - scaleVariation;

				let pos = { x: posX, y: posY, z: posZ };
				let scale = { x: 1, y: 1 + scaleY, z: 1 };
				let quat = { x: 0, y: 0, z: 0, w: 1 };
				let mass = 0;

				newObj.position.set(pos.x, pos.y, pos.z);
				newObj.scale.set(scale.x, scale.y, scale.z);
				scene.add(newObj);

				//ammo stuff
				let transform = new Ammo.btTransform();
				transform.setIdentity();
				transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
				transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
				let motionState = new Ammo.btDefaultMotionState(transform);
			
				let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5 * 2, scale.y * 0.5 * 4, scale.z * 0.5 * 2));
				colShape.setMargin(0.05);
			
				let localInertia = new Ammo.btVector3(0, 0, 0);
				colShape.calculateLocalInertia(mass, localInertia);
			
				let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
				let body = new Ammo.btRigidBody(rbInfo);
			
				physicsWorld.addRigidBody(body);
			}
		}
	}
}

function setupPhyiscsWorld() {
	let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
		dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
		overlappingPairCache = new Ammo.btDbvtBroadphase(),
		solver = new Ammo.btSequentialImpulseConstraintSolver();

	physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
	physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
}

function setupGraphics() {
	//this setup renderer
	rootElement = document.querySelector('html');
	canvasElement = document.querySelector("#c");;
	renderer = new THREE.WebGLRenderer({ canvas: canvasElement });
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	//create scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xAA9999);

	//create lights
	let light1 = new THREE.AmbientLight(0xAA9999, 1);

	let light2 = new THREE.DirectionalLight(0xCCCCCC, 0.5);
	light2.position.set(300, 200, 0);
	light2.castShadow = true;
	light2.shadow.mapSize.width = 10240;
	light2.shadow.mapSize.height = 10240;
	light2.shadow.camera.near = 0.5; // default
	light2.shadow.camera.far = 600; // default
	light2.shadow.camera.left = -250;
	light2.shadow.camera.right = 250;
	light2.shadow.camera.bottom = -250;
	light2.shadow.camera.top = 250;

	//create playable character
	createPlayer();

	//create floor
	createFloor();

	//load custom modeled obj
	let mloader = new THREE.MTLLoader();

	mloader.load('tree.mtl', function (materials) {
		materials.preload();

		let oLoader = new THREE.OBJLoader();
		oLoader.setMaterials(materials);
		oLoader.load('tree.obj', function (object) {
			object.castShadow = true;
			object.receiveShadow = true;

			object.children.forEach((child) => {
				child.castShadow = true;
				child.receiveShadow = true;
			})

			generateTrees(object);
		});
	});

	//add all objects to the scene
	scene.add(light1);
	scene.add(light2);

	clock = new THREE.Clock();
}

function initScene() {
	tmpTrans = new Ammo.btTransform();
	setupPhyiscsWorld();
	setupGraphics();
	requestAnimationFrame(loop);
}

function resizeRendererToDisplaySize(renderer) {
	const width = canvasElement.clientWidth;
	const height = canvasElement.clientHeight;
	const needResize = canvasElement.width !== width || canvasElement.height !== height;

	if (needResize) {
		renderer.setSize(width, height, false);
	}

	return needResize;
}

function update(deltaTime) {
	controls.update(deltaTime);

	// Step world
	physicsWorld.stepSimulation(deltaTime, 10);

	// Update rigid bodies
	for (let i = 0; i < rigidBodies.length; i++) {
		let objThree = rigidBodies[i];
		let objAmmo = objThree.userData.physicsBody;
		objAmmo.setActivationState(1);
		let ms = objAmmo.getMotionState();
		if (ms) {
			ms.getWorldTransform(tmpTrans);
			let p = tmpTrans.getOrigin();
			let q = tmpTrans.getRotation();
			objThree.position.set(p.x(), p.y(), p.z());
			objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
			objThree.updateMatrixWorld();
		}
	}
}

function render() {
	//resize renderer camera shit
	if (resizeRendererToDisplaySize(renderer)) {
		camera.aspect = canvasElement.clientWidth / canvasElement.clientHeight;
		camera.updateProjectionMatrix();
	}

	//draw
	renderer.render(scene, camera);
}

function loop() {
	requestAnimationFrame(loop);
	let deltaTime = clock.getDelta();
	update(deltaTime);
	render();
}
Ammo().then(initScene);