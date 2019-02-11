import * as itowns from 'itowns';
import * as THREE from 'three';
import { getColor } from './color';

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


const fragmentShader_walls = `
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

const fragmentShader_roof = `
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

const fragmentShader_edges = `
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
        mode: {type: 'i', value: 0},                               // Shader mode : it's an integer between 0 and 1 : 0 = color mode, 1 = texture mode
        color: {type: 'c', value: new THREE.Color('white')},       // Default color parameter
        opacity: {type: 'f', value: 1.0},                          // Default opacity parameter
        texture_scale : {type: 'f', value: 0.1}                    // Scale factor on texture (float between 0.0 and 1.0)
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

let ShadMatRoof = createMaterial(vertexShader, fragmentShader_roof);
let ShadMatWalls = createMaterial(vertexShader, fragmentShader_walls);
let ShadMatEdges = createMaterial(vertexShader, fragmentShader_edges);

// Function that takes a mesh as argument and returns it with a shader

function addShader(result){
  var walls = result.children[0];
  var roof = result.children[1];
  var edges = result.children[2];
  roof.material = ShadMatRoof;
  walls.material = ShadMatWalls;
  edges.material = ShadMatEdges;
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

function acceptFeature(p) {
    return p.z_min !== 9999;
}

let bati = {
    id: 'WFS Buildings',
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings,
        attributes: {
            color: { type: Uint8Array, value: (prop, id, extruded) => { return new THREE.Color(extruded ? 0xffffff : 0x888888);}, itemSize:3, normalized:true },
            zbottom: { type: Float32Array, value: altitudeBuildings },
            id: { type: Uint32Array, value: (prop, id) => { return id;}}
        },
    }),
    onMeshCreated: addShader,     // When the event of mesh creation : the code calls a shader and applies it to mesh
    filter: acceptFeature,
    source: {
        url: 'https://wxs.ign.fr/oej022d760omtb9y4b19bubh/geoportail/wfs?',
        protocol: 'wfs',
        version: '2.0.0',
        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
        projection: 'EPSG:4326',
        ipr: 'IGN',
        format: 'application/json',
        zoom: { min: 16, max: 16 },  // Beware that showing building at smaller zoom than ~16 create some holes as the WFS service can't answer more than n polylines per request
    }
};

export {bati, getColorForLevelX, colorForWater, ShadMatRoof, ShadMatWalls, ShadMatEdges, resultoss};
