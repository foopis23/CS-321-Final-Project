const π = Math.PI;

var scene, rootElement, canvasElement, renderer, camera, controls, clock, physicsWorld, rigidBodies = [], tmpTrans, treeMaterials = [];

var loading = true;

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
		this.fly = false;

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
	}

	onMouseDown(event) {

	}

	onMouseUp(event) {
		window.focus();
		this.domElement.requestPointerLock();
	}

	onKeyDown(event) {
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


			//toggle stuff
			case 219: /*[*/ toggleFlatShading(); break;
			case 221: /*]*/ toggleWireframe(); break;
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
		if (this.fly) velocity.setY(0);
		angularVelocity.setY(0);

		if (this.moveForward || (this.autoForward && !this.moveBackward)) {
			velocity.setZ(this.movementSpeed * lookAtVector.z);
			velocity.setX(this.movementSpeed * lookAtVector.x);
			if (this.fly) velocity.setY(this.movementSpeed * lookAtVector.y)
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

	teleport(x, y, z) {
		let transform = this.player.userData.physicsBody.getWorldTransform();
		transform.setOrigin(new Ammo.btVector3(x, y, z));
	}

	relTelport(x, y, z) {
		let transform = this.player.userData.physicsBody.getWorldTransform();
		let newX = this.player.position.x + x;
		let newY = this.player.position.y + y;
		let newZ = this.player.position.z + z;
		transform.setOrigin(new Ammo.btVector3(newX, newY, newZ));
	}
}



function createPlayer() {
	let pos = { x: 0, y: 0, z: 0 };
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
	playerWrapper.position.set(pos.x, pos.y, pos.z);
	playerWrapper.updateMatrixWorld();
	controls = new FirstPersonControls(playerWrapper, camera, canvasElement);
	controls.movementSpeed = 5;
	controls.lookSpeed = 10;
	controls.lookAt(0, 0, -10);
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

function createRectCollider(pos, scale, quat, mass) {
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

	return body;
}

function createBox(x, y, z, width, height, depth, rotX, rotY, rotZ, material, mass) {
	let pos = { x: x, y: y, z: z };
	let scale = { x: width, y: height, z: depth };

	let mesh = new THREE.Mesh(new THREE.BoxBufferGeometry(), material);
	mesh.position.set(x, y, z);
	mesh.scale.set(width, height, depth);
	mesh.rotation.set(rotX, rotY, rotZ);

	let quat = { x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w };

	let body = createRectCollider(pos, scale, quat, mass);

	return { mesh, body };
}

function addBox(x, y, z, width, height, depth, rotX, rotY, rotZ, material, mass, receiveShadow, castShadow) {
	let res = createBox(x, y, z, width, height, depth, rotX, rotY, rotZ, material, mass);
	res.mesh.receiveShadow = receiveShadow;
	res.mesh.castShadow = castShadow;
	scene.add(res.mesh);
	physicsWorld.addRigidBody(res.body);
}

function createHouseWall(x, y, z, width, height, rotX, rotY, color) {
	let pos = { x: x, y: y, z: z };
	let scale = { x: width, y: height, z: 1 };
	let mass = 0;

	let blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({ color }));

	blockPlane.position.set(pos.x, pos.y, pos.z);
	blockPlane.scale.set(scale.x, scale.y, scale.z);
	blockPlane.rotation.set(rotX, rotY, 0);

	let quat = { x: blockPlane.quaternion.x, y: blockPlane.quaternion.y, z: blockPlane.quaternion.z, w: blockPlane.quaternion.w };

	blockPlane.castShadow = true;
	blockPlane.receiveShadow = true;

	scene.add(blockPlane);

	//Add Collider
	let body = createRectCollider(pos, scale, quat, mass);
	physicsWorld.addRigidBody(body);
}

function addHouse() {
	const width = 10;
	const height = 10;
	const depth = 10;
	const z = -10;
	const x = 0;
	const material = new THREE.MeshPhongMaterial({color: 0x5F443E});

	//backWall
	addBox(x, 0, z - depth / 2 + 0.25, width, height, 0.5, 0, 0, 0, material, 0, true, true);
	addBox(x, -90, z - depth / 2 + 0.25, width, height, 0.5, 0, 0, 0, material, 0, true, true);

	//left sidewall
	addBox(x - width / 2, 0, z, width, height, 0.5, 0, Math.PI / 2, 0, material, 0, true, true);
	addBox(x - width / 2, -90, z, width, height, 0.5, 0, Math.PI / 2, 0, material, 0, true, true);

	//right sidwall
	addBox(x + width / 2, 0, z, width, height, 0.5, 0, Math.PI / 2, 0, material, 0, true, true);
	addBox(x + width / 2, -90, z, width, height, 0.5, 0, Math.PI / 2, 0, material, 0, true, true);

	//roof
	addBox(x, height / 2 - 0.25, z, width, height, 0.5, Math.PI / 2, 0, 0, material, 0, true, true);
	addBox(x, height / 2 - 0.25 - 90, z, width, height, 0.5, Math.PI / 2, 0, 0, material, 0, true, true);

	addBox(x, -92, z, width, height, 0.5, Math.PI / 2, 0, 0, new THREE.MeshPhongMaterial({color: 0x09361e, reflectivity: 0, shininess: 0, specular: 0x000000}), 0, true, true)
}

function addForest(object) {
	const mapWidth = 100;
	const mapDepth = 100;
	const treeDensity = 0.25;
	const posVariation = 1;
	const scaleVariation = 0.2;
	const trunkVariation = 0.1;
	const treeDistance = 2.6;
	addBox(0, -2, 0, mapWidth, 1, mapDepth, 0, 0, 0, new THREE.MeshPhongMaterial({color: 0x09361e, reflectivity: 0, shininess: 0, specular: 0x000000}), 0, true, false);

	let mapWidthH = mapWidth / 2;
	let mapDepthH = mapDepth / 2;
	for (let x = -mapWidthH; x < mapWidthH; x += treeDistance) {
		for (let z = -mapDepthH; z < mapDepthH; z += treeDistance) {
			if (Math.abs(x) < 11 && z < 5 && z > -20) continue;

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

				let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5 * 2, scale.y * 0.5 * 6, scale.z * 0.5 * 2));
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

			addForest(object);
			loading = false;
		});
	});

	//create lights
	let light1 = new THREE.AmbientLight(0x222244, 2);

	let light2 = new THREE.DirectionalLight(0xDDDDFF, 4);
	light2.position.set(300, 200, -100);
	light2.castShadow = true;

	//the shadows still look bad :-(
	light2.shadow.mapSize.width = 500 * 102400;
	light2.shadow.mapSize.height = 200 * 102400;
	light2.shadow.camera.near = 0.5; // default
	light2.shadow.camera.far = 600; // default
	light2.shadow.camera.left = -250;
	light2.shadow.camera.right = 250;
	light2.shadow.camera.bottom = -100;
	light2.shadow.camera.top = 100;
	scene.add(new THREE.Mesh(new THREE.SphereBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xffff00})));
	scene.add(light1);
	scene.add(light2);

	//create a little building
	addHouse();

	//create playable character
	createPlayer();

	let skycolor = new THREE.Color(0xAA9999);
	scene.background = skycolor;
	let fogcolor = new THREE.Color(0xAAAAAA);
	scene.fog = new THREE.FogExp2(fogcolor, 0.03);

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
	if (loading) return;
	let deltaTime = clock.getDelta();
	update(deltaTime);
	render();
}

function toggleMaterialSetting(key) {
	let materialsSwitched = {};
	
	scene.children.forEach((child) => {
		switch(child.type) {
			case "Mesh":
				if (!materialsSwitched[child.material.uuid]) {
					child.material[key] = !child.material[key];
					child.material.needsUpdate = true;
					materialsSwitched[child.material.uuid] = true;
				}
				
				break;
			case "Group": //handles duplicated trees
				if (!materialsSwitched[child.children[0].material[0].uuid] || !materialsSwitched[child.children[0].material[1].uuid]) {
					child.children[0].material[0][key] = !child.children[0].material[0][key];
					child.children[0].material[0].needsUpdate = true;
					materialsSwitched[child.children[0].material[0].uuid] = true;
					
					child.children[0].material[1][key] = !child.children[0].material[1][key];
					child.children[0].material[1].needsUpdate = true;
					materialsSwitched[child.children[0].material[1].uuid] = true;
				}
				break;
		}
	});
}

function toggleFlatShading() {
	toggleMaterialSetting('flatShading');
}

function toggleWireframe() {
	toggleMaterialSetting('wireframe');
}

Ammo().then(initScene);