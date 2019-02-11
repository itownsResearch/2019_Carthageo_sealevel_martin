import * as itowns from 'itowns';
import * as THREE from 'three';
import { getColor } from './color';

// function createMaterial(vShader, fShader) {
//     let uniforms = {
//         time: {type: 'f', value: 0.2},
//         waterLevel: {type: 'f', value: 0.0},
//         // resolution: {type: "v2", value: new THREE.Vector2()},
//     };
//     // uniforms.resolution.value.x = window.innerWidth;
//     // uniforms.resolution.value.y = window.innerHeight;
//
//     let meshMaterial = new THREE.ShaderMaterial({
//         uniforms: uniforms,
//         vertexShader: vShader,
//         fragmentShader: fShader,
//         transparent: true,
//         opacity: 1.0,
//         side: THREE.DoubleSide
//     });
//     return meshMaterial;
// }
//
// const vertexShader = `
// #include <logdepthbuf_pars_vertex>
// uniform float time;
// attribute float zbottom;
// varying float zbot;
//
// void main(){
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//     zbot = zbottom;
//     #include <logdepthbuf_vertex>
// }
// `;
//
// const fragmentShader = `
// #include <logdepthbuf_pars_fragment>
// uniform float time;
// uniform float waterLevel;
// varying float zbot;
//
// #define PI 3.14159
// #define TWO_PI (PI*2.0)
// #define N 68.5
//
// void main(){
//     #include <logdepthbuf_fragment>
//     if (abs(zbot) > 1000.0){
//         gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
//         return;
//     }
//     if (waterLevel - zbot > 3.0){
//         gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
//         return;
//     }
//     else if (waterLevel - zbot > 2.0){
//         gl_FragColor = vec4(1.0, 1., 0.1, 1.0);
//         return;
//     }
//     else if (waterLevel - zbot > 0.0){
//         gl_FragColor = vec4(0.8, 0.7, 0.0, 1.0);
//         return;
//     }
//     gl_FragColor = vec4(0.0, 0.9, 0.1, 1.0);
// }
// `;
//
// let shadMatRem = createMaterial(vertexShader, fragmentShader);
//
//
// function addShader(result){
//     result.material = shadMatRem;
// }

////////////////////////////////////////////////////////////////////////////////////// VERTEX SHADERS ////////////////////////////////////////////////////////////////////////////////////

const vertexShader = `
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;

void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  #include <logdepthbuf_vertex>
}
`;


////////////////////////////////////////////////////////////////////////////////////// FRAGMENT SHADERS ////////////////////////////////////////////////////////////////////////////////////

// Shader pour le rendu des murs

const fragmentShader_walls_Rem = `
#include <logdepthbuf_pars_fragment>
#define MODE_COLOR   0
#define MODE_TEXTURE 1
#define MODE_UV      2
uniform sampler2D texture_walls;
uniform int mode;
uniform float texture_scale;
varying vec2 vUv;
uniform float opacity;
uniform vec3 color;

void main(){
  #include <logdepthbuf_fragment>
  vec2 normUV = texture_scale * vec2(vUv.x * 100000., vUv.y);
  if (mode == MODE_TEXTURE) {
    gl_FragColor = texture2D(texture_walls, normUV);
  } else if (mode == MODE_UV) {
      gl_FragColor = vec4(fract(normUV),0.,1.);
  } else {
    gl_FragColor = vec4(color, opacity);
  }
}
`;

// Shader pour le rendu du toit

const fragmentShader_roof_Rem = `
#include <logdepthbuf_pars_fragment>
#define MODE_COLOR   0
#define MODE_TEXTURE 1
#define MODE_UV      2
uniform sampler2D texture_roof;
uniform int mode;
uniform float texture_scale;
varying vec2 vUv;
uniform float opacity;
uniform vec3 color;

void main(){
  #include <logdepthbuf_fragment>
  vec2 normUV = texture_scale * vUv * 10000.;
  if(mode == MODE_TEXTURE){
    gl_FragColor = texture2D(texture_roof, normUV);
  } else if (mode == MODE_UV) {
    gl_FragColor = vec4(fract(normUV),0.,1.);
  } else {
    gl_FragColor = vec4(color, opacity);
  }
}
`;

// Shader pour le rendu des arêtes

const fragmentShader_edges_Rem = `
#include <logdepthbuf_pars_fragment>
uniform float opacity;
uniform vec3 color;

void main(){
  #include <logdepthbuf_fragment>
  gl_FragColor = vec4(color, opacity);
}
`;

////////////////////////////////////////////////////////////////////  SHADERS IMPLEMENTATION  /////////////////////////////////////////////////////////////////////////


///// Material creation characterized by its uniforms /////

const texture_walls =  new THREE.TextureLoader().load("textures/white-wall.jpg");
const texture_roof = new THREE.TextureLoader().load("textures/rooftile.jpg");
texture_walls.wrapS = THREE.RepeatWrapping;  // wrapS enables to repeat the texture horizontally
texture_walls.wrapT = THREE.RepeatWrapping;  // wrapT enables to repeat the texture vertically
texture_roof.wrapS = THREE.RepeatWrapping;
texture_roof.wrapT = THREE.RepeatWrapping;

function createMaterial(vShader, fShader) {

    // Default parameters taking into account by shaders in their initial state

    let uniforms = {
        texture_roof: {type : 'sampler2D', value : texture_roof},       // Texture for modelisation of roof
        texture_walls: {type : 'sampler2D', value : texture_walls},     // Texture for modelisation of walls
        mode: {type: 'i', value: 0},                                    // Shader mode : it's an integer between 0 and 1 : 0 = color mode, 1 = texture mode
        color: {type: 'c', value: new THREE.Color('white')},            // Default color parameter
        opacity: {type: 'f', value: 1.0},                               // Default opacity parameter
        texture_scale : {type: 'f', value: 0.1}                         // Scale factor on texture (float between 0.0 and 1.0)
    };

    let meshMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vShader,
        fragmentShader: fShader,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    return meshMaterial;
}

let resultoss;

// One shaderMaterial for each type of geometries (edges, walls, roof) : in the whole, 3 shaders are needed.

let ShadMatRoofRem = createMaterial(vertexShader, fragmentShader_roof_Rem);
let ShadMatWallsRem = createMaterial(vertexShader, fragmentShader_walls_Rem);
let ShadMatEdgesRem = createMaterial(vertexShader, fragmentShader_edges_Rem);

// Function that takes a mesh as argument and returns it with a shader

function addShader(result){
  var walls = result.children[0];
  var roof = result.children[1];
  var edges = result.children[2];
  roof.material = ShadMatRoofRem;
  walls.material = ShadMatWallsRem;
  edges.material = ShadMatEdgesRem;
  resultoss = result;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}

function altitudeBuildings(properties) {
    return - properties.hauteur;
}


let getColorForLevelX = (nivEau) => ( (alti) => getColor(alti, nivEau) );
let colorForWater = getColorForLevelX(0);

function colorBuildings(properties) {
    let altiBuilding = altitudeBuildings(properties);
    return colorForWater(altiBuilding);
}

function  acceptFeature(p) {
    return p.z_min !== 9999;
}

let batiRem = {
    id: 'WFS Buildings Remarquable',
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        //color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings,
        attributes: {
            zbottom: { type: Float32Array, value: altitudeBuildings },
            id: { type: Uint32Array, value: (prop, id) => { return id } }
        },
    }),
    onMeshCreated: addShader,
    filter: acceptFeature,
    source: {
        url: 'https://wxs.ign.fr/oej022d760omtb9y4b19bubh/geoportail/wfs?',
        protocol: 'wfs',
        version: '2.0.0',
        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable',
        projection: 'EPSG:4326',
        ipr: 'IGN',
        format: 'application/json',
        zoom: { min: 12, max: 12 }
    }
};


// export default bati;
export {batiRem, ShadMatRoofRem, ShadMatWallsRem, ShadMatEdgesRem};
