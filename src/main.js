import * as itowns from 'itowns'
import GuiTools from './gui/GuiTools'
import {ToolTip} from './utils/FeatureToolTip'

import binarySearch from './utils/search'
import { createLinks } from './utils/scenario'
import mairies from '../data/mairies'
import scenario from '../data/scenar.js'

import * as THREE from 'three';  // We need THREE (no more exposed by itowns?)

import IGN_MNT_HR from './layers/IGN_MNT_HIGHRES'
import IGN_MNT from './layers/IGN_MNT'
import DARK from './layers/DARK'
import Ortho from './layers/Ortho'
import Slopes from './layers/slopesImage'
import {iso_1_config, iso_5_config} from './layers/isolines'
import iso_1 from './layers/iso_1'
import iso_5 from './layers/iso_5'
import WORLD_DTM from './layers/WORLD_DTM'
import {bati, ShadMatRoof, ShadMatWalls, ShadMatEdges} from './layers/bati'
import {batiRem, ShadMatRoofRem, ShadMatWallsRem, ShadMatEdgesRem} from './layers/bati_remarquable'

// around Bordeaux
let positionOnGlobe = { longitude: -0.525, latitude: 44.85, altitude: 250 };
let coords = { lon: -0.650, lat: 44.905, deltaLon: 0.160, deltaLat: -0.110 };
// île de Ré
positionOnGlobe = { longitude: -1.3918304443359375, latitude: 46.1865234375, altitude: 80 };
coords = { lon: -1.3918304443359375, lat: 46.1865234375, deltaLon: 0.300, deltaLat: -0.150 };

const viewerDiv = document.getElementById('viewerDiv');
const htmlInfo = document.getElementById('info');
const boardInfo = document.getElementById('boardSpace');

// Options for segments in particular is not well handled
// We modified some code in itowns and created an issue https://github.com/iTowns/itowns/issues/910
let options = { segments: 128 }; // We specify a more refined tile geomtry than default 16*16
const globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, options);
const menuGlobe = new GuiTools('menuDiv', globeView);

// I have to call it twice to make it works, even if i destroy the result immediately, don't ask why..
let liness = createLinks(scenario);
liness = null;
// the last line described in the json is just added to make it work, we won't add it to the scene, strange hack..
const lines = createLinks(scenario);
lines.pop();

function addtoscene(lines){
    for (let i = 0; i < lines.length; ++i) {
        globeView.scene.add(lines[i]);
    }
}

function adjustAltitude(value) {
    // A.D Here we specify the Z displacement for the water
    var displacement = value;
    globeView.setDisplacementZ(displacement);
    globeView.notifyChange();
}

// Set water representation mode in shaders
function setMode(value) {
    var v = parseInt(value);
    globeView.updateMaterialUniformMode(v);
    globeView.notifyChange();
}

//passing value to the buildings shaders
/*function adjustBuildingColors(value) {
    shadMat.uniforms.waterLevel.value = value;
    shadMatRem.uniforms.waterLevel.value = value;
}*/

function setLinesVisibility(lines, value){
    for(let i = 0; i < lines.length ; ++i) {
        lines[i].visible = (value >= scenario.links[i].hauteur_dysf);
    }
}

globeView.addLayer(Ortho);
globeView.addLayer(DARK);
globeView.addLayer(WORLD_DTM);
globeView.addLayer(IGN_MNT_HR);
globeView.addLayer(bati);
globeView.addLayer(batiRem);
globeView.addLayer(iso_1)
globeView.addLayer(iso_5);

const irisLayer = {
    type: 'color',
    id: 'iris',
    name: 'iris',
    transparent: true,
    style: {
        fill: 'orange',
        fillOpacity: 0.01,
        stroke: 'white',
    },
    source: {
        url: 'data/iris.geojson',
        protocol: 'file',
        projection: 'EPSG:4326',
    },
    visible: false
};

globeView.addLayer(irisLayer);


/*************************************** WATER A.D ***********************************************/
// Here we create the Tile geometry for the water using a globe with specific vertex displacement
let object3d = new THREE.Object3D();
let segments = 64;
const globeWater = itowns.createGlobeLayer('globeWater', { object3d, segments });
globeWater.disableSkirt = true;
globeWater.opacity = 0.999; // So we can handle transparency check for nice shading
// We can maybe specify a more refined geometry for the water using segments option
// But as the we represent the water as flat (no wave, ellipsoid like) we can keep a light geomtry
// globe2.noTextureColor = new itowns.THREE.Color(0xd0d5d8);

// add globeWater to the view so it gets updated
itowns.View.prototype.addLayer.call(globeView, globeWater);
//globeWater.addLayer(IGN_MNT_HR);
//itowns.View.prototype.addLayer.call(globeView, IGN_MNT_HR, globeWater);

// UGLY WAY. NEED TO REUSE IGN_MNT_HR  (TODO: check already used ID problem)
// We give the water the information of the ground to make some rendering
// using water height and other stuff
// DONE, we change the ID, it should use the itowns cache so we share the data between globe and water
IGN_MNT_HR.id = 'HR_DTM_forWater';
itowns.View.prototype.addLayer.call(globeView, IGN_MNT_HR, globeWater);
// Ortho.id = 'Ortho_forWater';
// itowns.View.prototype.addLayer.call(globeView, Ortho, globeWater);
/* itowns.Fetcher.json('src/layers/IGN_MNS_HIGHRES.json').then(function _(litto3D) {
     //worldDTM.id = 'toto';
     itowns.View.prototype.addLayer.call(globeView, litto3D, globeWater);
 });
 */

/*
itowns.Fetcher.json('./layers/JSONLayers/OPENSM.json').then(function _(osm) {
    itowns.View.prototype.addLayer.call(globeView, osm, globeWater);
});
*/



/**************************************************************************************************/

let time = 0;
let currentWaterLevel = { val: 0 };
globeView.addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED, () => {
    const menuGlobe = new GuiTools('menuDiv', globeView);
    globeView.controls.minDistance = 50;  // Allows the camera to get closer to the ground
    addtoscene(lines);

    menuGlobe.addImageryLayersGUI(globeView.getLayers(l => l.type === 'color'));
    menuGlobe.addGeometryLayersGUI(globeView.getLayers(l => l.type === 'geometry' && l.id != 'globe'), ShadMatRoof, ShadMatWalls, ShadMatEdges, ShadMatRoofRem, ShadMatWallsRem, ShadMatEdgesRem);

    menuGlobe.gui.add({wallMode : ShadMatWalls.uniforms.mode.value}, 'wallMode').min(0).max(2).step(1).onChange(
      function updateWallMode(value){
            ShadMatWalls.uniforms.mode.value = value;
            globeView.notifyChange(true);
      }
    );


    menuGlobe.gui.add({roofMode : ShadMatRoof.uniforms.mode.value}, 'roofMode').min(0).max(2).step(1).onChange(
      function updateRoofMode(value){
            ShadMatRoof.uniforms.mode.value = value;
            globeView.notifyChange(true);
      }
    );


    menuGlobe.gui.add({edgesMode : ShadMatEdges.uniforms.mode.value}, 'edgesMode').min(0).max(2).step(1).onChange(
      function updateEdgesMode(value){
            ShadMatEdges.uniforms.mode.value = value;
            globeView.notifyChange(true);
      }
    );


    menuGlobe.gui.add({wallScale : 0.1}, 'wallScale').min(0.1).max(1).onChange(
      function updateScaleWallTexture(value){
            ShadMatWalls.uniforms.texture_scale.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.add({roofScale : 0.1}, 'roofScale').min(0.1).max(1).onChange(
      function updateScaleRoofTexture(value){
            ShadMatRoof.uniforms.texture_scale.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.add({wallOpacity : 1.0}, 'wallOpacity').min(0.1).max(1).onChange(
      function updateOpacityWall(value){
            ShadMatWalls.uniforms.opacity.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.add({roofOpacity : 1.0}, 'roofOpacity').min(0.1).max(1).onChange(
      function updateOpacityRoof(value){
            ShadMatRoof.uniforms.opacity.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.add({edgeOpacity : 1.0}, 'edgeOpacity').min(0.1).max(1).onChange(
      function updateOpacityEdge(value){
            ShadMatEdges.uniforms.opacity.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.addColor({wallColor : ShadMatWalls.uniforms.color.value.getHex()}, 'wallColor').onChange(
      function updateColorWall(value){
            ShadMatWalls.uniforms.color.value = new THREE.Color(value);
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.addColor({roofColor : ShadMatRoof.uniforms.color.value.getHex()}, 'roofColor').onChange(
      function updateColorRoof(value){
            ShadMatRoof.uniforms.color.value = new THREE.Color(value);
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.addColor({edgeColor : ShadMatEdges.uniforms.color.value.getHex()}, 'edgeColor').onChange(
      function updateColorEdge(value){
            ShadMatEdges.uniforms.color.value = new THREE.Color(value);
            globeView.notifyChange(true);
      }
    );

    /* The same as before : controllers which impacts WFS Buidlings Remarquable parameters such as color, texture, opacity, ... */

    menuGlobe.gui.add({wallModeRem : ShadMatWallsRem.uniforms.mode.value}, 'wallModeRem').min(0).max(2).step(1).onChange(
      function updateWallMode(value){
            ShadMatWallsRem.uniforms.mode.value = value;
            globeView.notifyChange(true);
      }
    );


    menuGlobe.gui.add({roofModeRem : ShadMatRoofRem.uniforms.mode.value}, 'roofModeRem').min(0).max(2).step(1).onChange(
      function updateRoofMode(value){
            ShadMatRoofRem.uniforms.mode.value = value;
            globeView.notifyChange(true);
      }
    );


    menuGlobe.gui.add({edgesModeRem : ShadMatEdgesRem.uniforms.mode.value}, 'edgesModeRem').min(0).max(2).step(1).onChange(
      function updateEdgesMode(value){
            ShadMatEdgesRem.uniforms.mode.value = value;
            globeView.notifyChange(true);
      }
    );


    menuGlobe.gui.add({wallScaleRem : 0.1}, 'wallScaleRem').min(0.1).max(1).onChange(
      function updateScaleWallTexture(value){
            ShadMatWallsRem.uniforms.texture_scale.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.add({roofScaleRem : 0.1}, 'roofScaleRem').min(0.1).max(1).onChange(
      function updateScaleRoofTexture(value){
            ShadMatRoofRem.uniforms.texture_scale.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.add({wallOpacityRem : 1.0}, 'wallOpacityRem').min(0.1).max(1).onChange(
      function updateOpacityWall(value){
            ShadMatWallsRem.uniforms.opacity.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.add({roofOpacityRem : 1.0}, 'roofOpacityRem').min(0.1).max(1).onChange(
      function updateOpacityRoof(value){
            ShadMatRoofRem.uniforms.opacity.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.add({edgeOpacityRem : 1.0}, 'edgeOpacityRem').min(0.1).max(1).onChange(
      function updateOpacityEdge(value){
            ShadMatEdgesRem.uniforms.opacity.value = value;
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.addColor({wallColorRem : ShadMatWallsRem.uniforms.color.value.getHex()}, 'wallColorRem').onChange(
      function updateColorWall(value){
            ShadMatWallsRem.uniforms.color.value = new THREE.Color(value);
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.addColor({roofColorRem : ShadMatRoofRem.uniforms.color.value.getHex()}, 'roofColorRem').onChange(
      function updateColorRoof(value){
            ShadMatRoofRem.uniforms.color.value = new THREE.Color(value);
            globeView.notifyChange(true);
      }
    );

    menuGlobe.gui.addColor({edgeColorRem : ShadMatEdgesRem.uniforms.color.value.getHex()}, 'edgeColorRem').onChange(
      function updateColorEdge(value){
            ShadMatEdgesRem.uniforms.color.value = new THREE.Color(value);
            globeView.notifyChange(true);
      }
    );

});


// from itowns examples, can't say I really understand what is going on...
function picking(event) {
    if (globeView.controls.isPaused()) {
        //var htmlInfo = document.getElementById('info');
        var intersects = globeView.pickObjectsAt(event, 10, 'WFS Buildings Remarquable');
        var properties;
        var info;
        htmlInfo.innerHTML = ' ';
        if (intersects.length) {
            var geometry = intersects[0].object.feature.geometry;
            var idPt = (intersects[0].face.a) % (intersects[0].object.feature.vertices.length / 3);
            var id = binarySearch(geometry, idPt);
            properties = geometry[id].properties;

            Object.keys(properties).map(function (objectKey) {
                var value = properties[objectKey];
                var key = objectKey.toString();
                if (key[0] !== '_' && key !== 'geometry_name') {
                    info = value.toString();
                    htmlInfo.innerHTML += '<li><b>' + key + ': </b>' + info + '</li>';
                }
            });
            if (properties['nature'] === 'Mairie') {
                // getting some bullshit info
                let coords = globeView.controls.pickGeoPosition(globeView.eventToViewCoords(event));
                htmlInfo.innerHTML += '<p class="beware">' + mairies[properties['id']]['text'] + '</p>'
            }
        }
    }
}

let legends = [];
legends.push(document.getElementById('greenlegend'));
legends.push(document.getElementById('yellowlegend'));
legends.push(document.getElementById('orangelegend'));
legends.push(document.getElementById('redlegend'));

function changeBoardInfos(value) {
    boardInfo.innerHTML = '';
    let cl = 'bewareNiet';
    legends.forEach(element => { element.className = 'legend'; });
    if (value <= 0.7 ){
        legends[0].className = cl;
    } else if (0.8 <= value && value <= 2) {
        cl = 'bewareYellow';
        legends[1].className = cl;
    } else if (2 < value && value <= 3) {
        cl = 'bewareOrange';
        legends[2].className = cl;
    } else if (value > 3) {
        cl = 'beware';
        legends[3].className = cl;
    }
}

function animateLines() {
    time += 0.02;
    for (let i = 0; i < lines.length ; ++i) {
      lines[i].material.dashSize = lines[i].material.gapSize * (1+time);
    }
    time = time % 2;
    globeView.notifyChange(true);
    requestAnimationFrame(animateLines);
};
