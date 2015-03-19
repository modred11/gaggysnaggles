/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author paulirish / http://paulirish.com/
 * @author Carl Maxwell
*/

THREE.FirstPersonControls = function ( object, domElement ) {
	this.object = object;
	this.target = new THREE.Vector3( 0, 0, 0 );

	this.domElement = ( domElement !== undefined ) ? domElement : document;

	this.movementSpeed = 0.001;
	this.lookSpeed = 0.005;

	this.lookVertical = true;
	this.autoForward  = false;
	// this.invertVertical = false;

	this.activeLook = true;

	this.heightSpeed = false;
	this.heightCoef  = 1.0;
	this.heightMin   = 0.0;
	this.heightMax   = 1.0;

	this.constrainVertical = false;
	this.verticalMin = 0;
	this.verticalMax = Math.PI;

	this.mouseX = 0;
	this.mouseY = 0;
	this.mouseSensitivity = 0.5;

	this.lat   = 0;
	this.lon   = 0;
	this.phi   = 0;
	this.theta = 0;

	this.moveForward  = false;
	this.moveBackward = false;
	this.moveLeft     = false;
	this.moveRight    = false;
	this.freeze       = false;
  this.jump         = false;
  this.canJump      = true;

	this.velocity = new Vector3; //{x: 0, y: 0, z: 0};

	this.mouseDragOn = false;

	this.viewHalfX = 0;
	this.viewHalfY = 0;

	if ( this.domElement !== document ) {
		this.domElement.setAttribute( 'tabindex', -1 );
	}

	//

	this.handleResize = function () {

		if ( this.domElement === document ) {
			this.viewHalfX = window.innerWidth / 2;
			this.viewHalfY = window.innerHeight / 2;
		} else {
			this.viewHalfX = this.domElement.offsetWidth / 2;
			this.viewHalfY = this.domElement.offsetHeight / 2;
		}

	};

	this.onMouseMove = function ( e ) {
		var movementX = e.movementX       ||
		                e.mozMovementX    ||
		                e.webkitMovementX,

		movementY = e.movementY       ||
		            e.mozMovementY    ||
		            e.webkitMovementY;

		this.mouseX += movementX * this.mouseSensitivity;
		this.mouseY += movementY * this.mouseSensitivity;
	};

	this.onKeyDown = function ( event ) {
		//event.preventDefault();
		var t = (new Date()).getTime();

		switch ( event.keyCode ) {
			case 38: /*up*/
			case 87: /*W*/ this.moveForward = this.moveForward || t; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = this.moveLeft || t; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = this.moveBackward || t; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = this.moveRight || t; break;

			case 82: /*R*/ this.moveUp = this.moveRight || t; break;
			case 70: /*F*/ this.moveDown = this.moveDown || t; break;

			case 81: /*Q*/ this.freeze = !this.freeze; break;

      case 32: /*space*/ this.jump = this.canJump; break;
		}
	};

	this.onKeyUp = function ( event ) {
		switch( event.keyCode ) {
			case 38: /*up*/
			case 87: /*W*/ this.moveForward = false; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = false; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = false; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = false; break;

			case 82: /*R*/ this.moveUp = false; break;
			case 70: /*F*/ this.moveDown = false; break;

      case 32: /*space*/ this.jump = false; break;
		}
	};

	this.update = function( delta ) {

		if ( this.freeze ) return;

		var position = this.object.position;

		var moveSpeed = function(timestamp) {
			if (timestamp == false) return 0;

      return sin(min(3000, (new Date()).getTime() - timestamp)/3000 * (PI/2)) * h("1 seconds walk");
		};

		var decelerateSpeed = function(speed) {
			if (abs(speed) < 0.01) return 0;

			//speed = max(-6, min(6, speed));

			return speed * 0.9;//sin(0.6 * (speed/6) * (PI/2))*6 * 60;
		};

		var isValid = function(xChange, yChange, zChange) {
			return true;

			var x = position.x + h("1 block") * sin( this.object.rotation.z ) * cos( this.object.rotation.x ),
			    z = position.z + h("1 block") * sin( this.object.rotation.z ) * sin( this.object.rotation.x );

			return map.getHeight(x, z) < round(position.y/h("1 block"))+1;
		};

		this.velocity.x = decelerateSpeed(this.velocity.x);
		this.velocity.z = decelerateSpeed(this.velocity.z);

		if ( this.moveForward  && !this.moveBackward ) this.velocity.z  = -moveSpeed(this.moveForward );
		if ( this.moveBackward && !this.moveForward  ) this.velocity.z  =  moveSpeed(this.moveBackward);

		if ( this.moveLeft    && !this.moveRight     )  this.velocity.x = -moveSpeed(this.moveLeft    );
		if ( this.moveRight   && !this.moveLeft      )  this.velocity.x =  moveSpeed(this.moveRight   );

    //
    // check for collisions
    //

    // TODO I'd feel better if this used this.object.rotation.x or the like instead of mouse position
    var theta = THREE.Math.degToRad(this.mouseX);
    var radius = sqrt( pow(2, this.velocity.x) + pow(2, this.velocity.z) );
    var right_angle = THREE.Math.degToRad(90);

    var impulse = new Vector3(
      (cos(theta)*-this.velocity.z + cos(theta+right_angle)*this.velocity.x)*delta,
      0,
      (sin(theta)*-this.velocity.z + sin(theta+right_angle)*this.velocity.x)*delta
    );

    var forward = impulse.clone().normalize().multiply(0.07*h("1 block"));

    var check = function(dir) {
      return lineTrace(
        position.clone().sub(new Vector3(0, character_height - 0.5*h("1 block"), 0)),
        dir
      );
    };

    // TODO allow sliding collisions

    if (check(forward)) {
      impulse = new Vector3(0, 0, 0);
    }

    //
    // apply velocity to position
    //

		if (isValid.apply(this, [this.velocity.x, this.velocity.y, this.velocity.z])) {
			position.add(impulse);
      //position.x += (cos(theta)*-this.velocity.z + cos(theta+right_angle)*this.velocity.x)*delta;
			//position.z += (sin(theta)*-this.velocity.z + sin(theta+right_angle)*this.velocity.x)*delta;
		}

    //
    // orient the camera
    //

		var actualLookSpeed = delta * this.lookSpeed;

		if ( !this.activeLook ) actualLookSpeed = 0;

		var verticalLookRatio = 1;

		if ( this.constrainVertical )
			verticalLookRatio = PI / ( this.verticalMax - this.verticalMin );

		this.lon = this.mouseX;
		if( this.lookVertical ) this.lat = -this.mouseY;

		this.lat = max( - 85, min( 85, this.lat ) );
		this.phi = THREE.Math.degToRad( 90 - this.lat );

		this.theta = THREE.Math.degToRad( this.lon );

		if ( this.constrainVertical )
			this.phi = THREE.Math.mapLinear( this.phi, 0, Math.PI, this.verticalMin, this.verticalMax );

		var targetPosition = this.target;

		targetPosition.x = position.x + h("1 block") * sin( this.phi ) * cos( this.theta );
		targetPosition.y = position.y + h("1 block") * cos( this.phi );
		targetPosition.z = position.z + h("1 block") * sin( this.phi ) * sin( this.theta );

		this.object.lookAt( targetPosition );

    //
    // deal with vertical motion
    //

    var breath = (0.007 * sin((new Date).getTime() * PI / 1000 / 4));

		var verticalPosition = (map.getHeight(position.x, position.z) + character_height + breath);

    if (this.velocity.y > 0) {
      this.object.position.y += this.velocity.y * delta;

      this.velocity.y -= gravity * delta;
    } else if (!lineTrace(object.position, new Vector3(0, -(character_height + 0.01), 0))) {
      this.velocity.y -= gravity * delta;

      this.object.position.y += this.velocity.y  * delta;
    } else {
      this.object.position.y = verticalPosition;

      if (this.jump) {
        this.velocity.y += h("3 blocks") + gravity * 0.2;
        this.jump = false;
        this.canJump = false;
      } else {
        this.velocity.y = 0;
        this.canJump = true;
      }
    }
	};

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	this.domElement.addEventListener( 'mousemove', bind( this, this.onMouseMove ), false );
	//this.domElement.addEventListener( 'mousedown', bind( this, this.onMouseDown ), false );
	//this.domElement.addEventListener( 'mouseup'  , bind( this, this.onMouseUp   ), false );
	this.domElement.addEventListener( 'keydown'  , bind( this, this.onKeyDown   ), false );
	this.domElement.addEventListener( 'keyup'    , bind( this, this.onKeyUp     ), false );

	function bind( scope, fn ) {
		return function () {
			fn.apply( scope, arguments );
		};
	};

	this.handleResize();
};
