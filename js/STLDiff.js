var container;
var camera, controls, scene, renderer;
var stlWidth, stlHeight;
var beforeMesh, afterMesh;

init();
animate();

function init() {
    container = document.querySelector('#StlView')

    stlWidth = 800;
    stlHeight = 600;

    camera = new THREE.OrthographicCamera( -(stlWidth/3000), (stlWidth/3000), (stlHeight/3000), -(stlHeight/3000), -1000, 10000 );
    camera.up.set(0,0,1);
    camera.position.x = 2;
    camera.position.y = 2;
    camera.position.z = 2;

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x72645b );

    var gridHelper = new THREE.GridHelper( 0.25, 25 );// [m] => 1cm Grid
    gridHelper.rotation.x = Math.PI/2;
    gridHelper.position.y = 0;
    gridHelper.position.z = 0;
    scene.add( gridHelper );
    scene.add( new THREE.AxesHelper(2) );// [m]

    // File load
    var loader = new THREE.STLLoader();

    // Light
    scene.add( new THREE.HemisphereLight( 0xAAAAAA, 0x888888 ) );

    // renderer
    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( stlWidth, stlHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = false;

    container.appendChild( renderer.domElement );

    // controls
    controls = new THREE.OrbitControls( camera, renderer.domElement );

    document.getElementById( "beforeAlpha" ).addEventListener('input', setBeforeAlpha);
    document.getElementById( "afterAlpha" ).addEventListener('input', setAfterAlpha);
    document.getElementById( "ClearView" ).addEventListener('click', clearScene);
    window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
    camera.aspect = stlWidth / stlHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( stlWidth, stlHeight );
}

function setBeforeAlpha( input ) {
    beforeMesh.material.opacity = input.target.value;
    if( beforeMesh.material.opacity > 0.0 ) {
        beforeMesh.visible = true;
    }else{
        beforeMesh.visible = false;
    }
}

function setAfterAlpha( input ) {
    afterMesh.material.opacity = input.target.value;
    if( afterMesh.material.opacity > 0.0 ) {
        afterMesh.visible = true;
    }else{
        afterMesh.visible = false;
    }
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    renderer.render( scene, camera );
}

export function clearScene() {
    for( let index=(scene.children.length-1); index>=0 ; --index) {
        if( scene.children[index].type == "Mesh" ) {
            scene.children.splice( index, 1 );
        }
    }
}

export function spawnBeforeSTL( stl, scale ) {
    var material = new THREE.MeshStandardMaterial( { depthWrite: true, depthTest: true, transparent: true, opacity: 0.5, color: 0xFF0000 } );
    var loader = new THREE.STLLoader();

    beforeMesh = new THREE.Mesh( loader.parse(stl), material );
    beforeMesh.position.set( 0.0, 0.0, 0.0);
    beforeMesh.rotation.set( 0, 0, 0 );
    beforeMesh.scale.set( scale, scale, scale );

    scene.add( beforeMesh );
}

export function spawnAfterSTL( stl, scale ) {
    var material = new THREE.MeshStandardMaterial( { depthWrite: true, depthTest: true, transparent: true, opacity: 1.0, color: 0x00FF00 } );
    var loader = new THREE.STLLoader();

    afterMesh = new THREE.Mesh( loader.parse(stl), material );
    afterMesh.position.set( 0.0, 0.0, 0.0);
    afterMesh.rotation.set( 0, 0, 0 );
    afterMesh.scale.set( scale, scale, scale );

    scene.add( afterMesh );
}
