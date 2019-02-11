/**
 * Generated On: 2015-10-5
 * Class: GuiTools
 * Description: Classe pour créer un menu.
 */

/* global dat,viewerDiv, itowns */


import dat from 'dat.gui';
import * as itowns from 'itowns';
import * as THREE from 'three';


dat.GUI.prototype.removeFolder = function removeFolder(name) {
    var folder = this.__folders[name];
    if (!folder) {
        return;
    }
    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];
    this.onResize();
};

dat.GUI.prototype.hideFolder = function hideFolder(name, value) {
    var folder = this.__folders[name];
    if (!folder) {
        return;
    }
    folder.__ul.hidden = value;
};

function GuiTools(domId, view, w) {
    var width = w || 245;
    this.gui = new dat.GUI({ autoPlace: false, width: width });
    this.gui.domElement.id = domId;
    viewerDiv.appendChild(this.gui.domElement);
    this.colorGui = this.gui.addFolder('Color Layers');
    this.geometryGui = this.gui.addFolder('Geometry Layers');
    this.elevationGui = this.gui.addFolder('Elevation Layers');

    if (view) {
        this.view = view;
        view.addEventListener('layers-order-changed', (function refreshColorGui() {
            var i;
            var colorLayers = view.getLayers(function filter(l) { return l.type === 'color'; });
            for (i = 0; i < colorLayers.length; i++) {
                this.removeLayersGUI(colorLayers[i].id);
            }

            this.addImageryLayersGUI(colorLayers);
        }).bind(this));
    }
}

GuiTools.prototype.addLayerGUI = function fnAddLayerGUI(layer) {
    if (layer.type === 'color') {
        this.addImageryLayerGUI(layer);
    } else if (layer.type === 'elevation') {
        this.addElevationLayerGUI(layer);
    }
};

GuiTools.prototype.addLayersGUI = function fnAddLayersGUI() {
    function filterColor(l) { return l.type === 'color'; }
    function filterElevation(l) { return l.type === 'elevation'; }
    this.addImageryLayersGUI(this.view.getLayers(filterColor));
    this.addElevationLayersGUI(this.view.getLayers(filterElevation));
    // eslint-disable-next-line no-console
    console.info('menu initialized');
};

GuiTools.prototype.addImageryLayerGUI = function addImageryLayerGUI(layer) {
    var folder = this.colorGui.addFolder(layer.id);
    folder.add({ visible: layer.visible }, 'visible').onChange((function updateVisibility(value) {
        layer.visible = value;
        this.view.notifyChange(layer);
    }).bind(this));
    folder.add({ opacity: layer.opacity }, 'opacity').min(0.0).max(1.0).onChange((function updateOpacity(value) {
        layer.opacity = value;
        this.view.notifyChange(layer);
    }).bind(this));
    folder.add({ frozen: layer.frozen }, 'frozen').onChange((function updateFrozen(value) {
        layer.frozen = value;
        this.view.notifyChange(layer);
    }).bind(this));
};

GuiTools.prototype.addElevationLayerGUI = function addElevationLayerGUI(layer) {
    var folder = this.elevationGui.addFolder(layer.id);
    folder.add({ frozen: layer.frozen }, 'frozen').onChange(function refreshFrozenGui(value) {
        layer.frozen = value;
    });
};

GuiTools.prototype.addImageryLayersGUI = function addImageryLayersGUI(layers) {
    var i;
    var seq = itowns.ImageryLayers.getColorLayersIdOrderedBySequence(layers);
    var sortedLayers = layers.sort(function comp(a, b) {
        return seq.indexOf(a.id) < seq.indexOf(b.id);
    });
    for (i = 0; i < sortedLayers.length; i++) {
        this.addImageryLayerGUI(sortedLayers[i]);
    }
};

GuiTools.prototype.addElevationLayersGUI = function addElevationLayersGUI(layers) {
    var i;
    for (i = 0; i < layers.length; i++) {
        this.addElevationLayerGUI(layers[i]);
    }
};

/// Function that takes a geometry layer and 6 shaders (3 for WFS Buidings and 3 for WFS Buildings Remarquable)

GuiTools.prototype.addGeometryLayerGUI = function addGeometryLayerGUI(layer, ShadMatRoof, ShadMatWalls, ShadMatEdges, ShadMatRoofRem, ShadMatWallsRem, ShadMatEdgesRem) {
    // Folder is created into GUI by layer
    var folder = this.geometryGui.addFolder(layer.id);

    // Layer visibility management
    folder.add({ visible: layer.visible }, 'visible').onChange((function updateVisibility(value) {
        layer.visible = value;
        this.view.notifyChange(layer);
    }).bind(this));

    // Layer opacity management
    folder.add({ opacity: layer.opacity }, 'opacity').min(0.0).max(1.0).onChange((function updateOpacity(value) {
        layer.opacity = value;
        this.view.notifyChange(layer);
    }).bind(this));

    // Layer wireframe management : parameter 'wireframe' enables to see buildings' edges without seeing roof and walls

    folder.add({ wireframe: layer.wireframe }, 'wireframe').onChange((function updateWireframe(value) {
        layer.wireframe = value;
        this.view.notifyChange(layer);
    }).bind(this));

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////// 3D STYLES IMPLEMENTATION ////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* Creation of a subfolder called 'style' for each GeometryLayer, in which users will be able to check boxes according to the style they want to choose :
       in our application, the different geometry layers which interest us are WFS Buildings Layer (WFS Buildings and WFS Buildings Remarquable) */

    var subfolder_style = folder.addFolder('style');

    /// We get in memory initial values of shaders' parameters to use them again when boxes are unchecked after being checked.

    let init_texture_roof = ShadMatRoof.uniforms.texture_roof.value;
    let init_texture_walls = ShadMatWalls.uniforms.texture_walls.value;
    let init_color_edges = ShadMatEdges.uniforms.color.value;
    let init_color_roof = ShadMatRoof.uniforms.color.value;
    let init_color_walls = ShadMatWalls.uniforms.color.value;
    let init_opacity_walls = ShadMatWalls.uniforms.opacity.value;
    let init_opacity_roof = ShadMatRoof.uniforms.opacity.value;
    let init_opacity_edges = ShadMatEdges.uniforms.opacity.value;
    let init_mode_walls = ShadMatWalls.uniforms.mode.value;
    let init_mode_roof = ShadMatRoof.uniforms.mode.value;

    let init_texture_roof_rem = ShadMatRoofRem.uniforms.texture_roof.value;
    let init_texture_walls_rem = ShadMatWallsRem.uniforms.texture_walls.value;
    let init_color_edges_rem = ShadMatEdgesRem.uniforms.color.value;
    let init_color_roof_rem = ShadMatRoofRem.uniforms.color.value;
    let init_color_walls_rem = ShadMatWallsRem.uniforms.color.value;
    let init_opacity_walls_rem = ShadMatWallsRem.uniforms.opacity.value;
    let init_opacity_roof_rem = ShadMatRoofRem.uniforms.opacity.value;
    let init_opacity_edges_rem = ShadMatEdgesRem.uniforms.opacity.value;
    let init_mode_walls_rem = ShadMatWallsRem.uniforms.mode.value;
    let init_mode_roof_rem = ShadMatRoofRem.uniforms.mode.value;

    /// We need to load textures to use them

    const tex_slatetile = new THREE.TextureLoader().load("textures/slatetile.jpg");
    const tex_rooftile = new THREE.TextureLoader().load("textures/rooftile.jpg");
    const tex_glass = new THREE.TextureLoader().load("textures/glass.png");
    const tex_wall = new THREE.TextureLoader().load("textures/wall.jpg");
    const tex_stone_wall = new THREE.TextureLoader().load("textures/stone-wall.jpg");
    const tex_mirror = new THREE.TextureLoader().load("textures/mirror.jpg");
    const tex_brick = new THREE.TextureLoader().load("textures/beton.png");
    const tex_wood = new THREE.TextureLoader().load("textures/wood.jpg");
    const tex_antiquated_wall = new THREE.TextureLoader().load("textures/antiquated.jpg");
    const tex_clean_wall = new THREE.TextureLoader().load("textures/white-wall.jpg");

    // We apply repetition wrapping on textures so that buidings are well textured
    tex_rooftile.wrapS = THREE.RepeatWrapping;
    tex_rooftile.wrapT = THREE.RepeatWrapping;
    tex_slatetile.wrapS = THREE.RepeatWrapping;
    tex_slatetile.wrapT = THREE.RepeatWrapping;
    tex_glass.wrapS = THREE.RepeatWrapping;
    tex_glass.wrapT = THREE.RepeatWrapping;
    tex_wall.wrapS = THREE.RepeatWrapping;
    tex_wall.wrapT = THREE.RepeatWrapping;
    tex_stone_wall.wrapS = THREE.RepeatWrapping;
    tex_stone_wall.wrapT = THREE.RepeatWrapping;
    tex_mirror.wrapS = THREE.RepeatWrapping;
    tex_mirror.wrapT = THREE.RepeatWrapping;
    tex_brick.wrapS = THREE.RepeatWrapping;
    tex_brick.wrapT = THREE.RepeatWrapping;
    tex_wood.wrapS = THREE.RepeatWrapping;
    tex_wood.wrapT = THREE.RepeatWrapping;
    tex_antiquated_wall.wrapS = THREE.RepeatWrapping;
    tex_antiquated_wall.wrapT = THREE.RepeatWrapping;
    tex_clean_wall.wrapS = THREE.RepeatWrapping;
    tex_clean_wall.wrapT = THREE.RepeatWrapping;
    tex_clean_wall.wrapS = THREE.RepeatWrapping;
    tex_clean_wall.wrapT = THREE.RepeatWrapping;

    ////// Adding of 3D styles into GUI (Graphic User Interface) ///////

    // First style to be implemented : Fluorescent Style //

    subfolder_style.add({ Fluorescent : false }, 'Fluorescent').onChange((function updateStyle(value){
        if (value){
          // Differenciation between WFS Buidlings and WFS Buildings Remarquable
          if (layer.id == 'WFS Buildings'){
              ShadMatWalls.uniforms.mode.value = 0;                             /// Color mode for shader in charge of walls modeling
              ShadMatRoof.uniforms.mode.value = 0;                              /// Color mode for shader in charge of roof modeling
              ShadMatRoof.uniforms.color.value = new THREE.Color('yellow');     /// Color calling for roof
              ShadMatWalls.uniforms.color.value = new THREE.Color('yellow');    /// Color calling for walls
              ShadMatEdges.uniforms.color.value = new THREE.Color('grey');      /// Color calling for edges
              ShadMatRoof.uniforms.opacity.value = 1.0;
              ShadMatWalls.uniforms.opacity.value = 0.7;

          } else if (layer.id == 'WFS Buildings Remarquable'){
              ShadMatWallsRem.uniforms.mode.value = 0;                              /// Color mode for shader in charge of walls modeling
              ShadMatRoofRem.uniforms.mode.value = 0;                               /// Color mode for shader in charge of roof modeling
              ShadMatRoofRem.uniforms.color.value = new THREE.Color('red');         /// Color calling for roof
              ShadMatWallsRem.uniforms.color.value = new THREE.Color('red');        /// Color calling for walls
              ShadMatEdgesRem.uniforms.color.value = new THREE.Color('black');      /// Color calling for edges
              ShadMatRoof.uniforms.opacity.value = 1.0;
              ShadMatWalls.uniforms.opacity.value = 1.0;
          }
        } else {
          /* Differenciation between WFS Buidlings and WFS Buildings Remarquable :
          we are coming back to initial values of shaders parameters */
          if (layer.id == 'WFS Buildings'){
              // We are coming back to default parameters values
              ShadMatWalls.uniforms.mode.value = init_mode_walls;
              ShadMatRoof.uniforms.mode.value = init_mode_roof;
              ShadMatRoof.uniforms.color.value = init_color_roof;
              ShadMatWalls.uniforms.color.value = init_color_walls;
              ShadMatEdges.uniforms.color.value = init_color_edges;
              ShadMatRoof.uniforms.texture_roof.value = init_texture_roof;
              ShadMatWalls.uniforms.texture_walls.value = init_texture_walls;

          } else if (layer.id == 'WFS Buildings Remarquable'){
              ShadMatWallsRem.uniforms.mode.value = init_mode_walls_rem;
              ShadMatRoofRem.uniforms.mode.value = init_mode_roof_rem;
              ShadMatRoofRem.uniforms.color.value = init_color_roof_rem;
              ShadMatWallsRem.uniforms.color.value = init_color_walls_rem;
              ShadMatEdgesRem.uniforms.color.value = init_color_edges_rem;
              ShadMatRoofRem.uniforms.texture_roof.value = init_texture_roof_rem;
              ShadMatWallsRem.uniforms.texture_walls.value = init_texture_walls_rem;
        }
      }
      this.view.notifyChange(layer, true);
    }).bind(this));

    // Second style to be implemented : Mirror Style //

    subfolder_style.add({ Mirror : false }, 'Mirror').onChange((function updateStyle(value){         // Detection of an event : the event enables to trigger a function afterwards
        if (value){    // Test if 'value' equals to 'true'
          if (layer.id == 'WFS Buildings'){
            ShadMatWalls.uniforms.mode.value = 1;                             /// Texture mode activated for shader in charge of walls modeling
            ShadMatRoof.uniforms.mode.value = 1;                              /// Texture mode activated for shader in charge of roof modeling
            ShadMatRoof.uniforms.texture_roof.value = tex_mirror;             /// Texture calling for roof
            ShadMatWalls.uniforms.texture_walls.value = tex_mirror;           /// Texture calling for walls
            ShadMatEdges.uniforms.color.value = new THREE.Color('grey');      /// Color calling for edges

          } else if (layer.id == 'WFS Buildings Remarquable') {
            ShadMatWallsRem.uniforms.mode.value = 1;                             /// Texture mode activated for shader in charge of walls modeling
            ShadMatRoofRem.uniforms.mode.value = 1;                              /// Texture mode activated for shader in charge of roof modeling
            ShadMatRoofRem.uniforms.texture_roof.value = tex_mirror;             /// Texture calling for roof
            ShadMatWallsRem.uniforms.texture_walls.value = tex_mirror;           /// Texture calling for walls
            ShadMatEdgesRem.uniforms.color.value = new THREE.Color('grey');      /// Color calling for edges
          }
        } else {
          if (layer.id == 'WFS Buildings'){
            // We are coming back to default parameters values
            ShadMatWalls.uniforms.mode.value = init_mode_walls;
            ShadMatRoof.uniforms.mode.value = init_mode_roof;
            ShadMatRoof.uniforms.color.value = init_color_roof;
            ShadMatWalls.uniforms.color.value = init_color_walls;
            ShadMatEdges.uniforms.color.value = init_color_edges;
            ShadMatRoof.uniforms.texture_roof.value = init_texture_roof;
            ShadMatWalls.uniforms.texture_walls.value = init_texture_walls;

          } else if (layer.id == 'WFS Buildings Remarquable') {
            ShadMatWallsRem.uniforms.mode.value = init_mode_walls_rem;
            ShadMatRoofRem.uniforms.mode.value = init_mode_roof_rem;
            ShadMatRoofRem.uniforms.color.value = init_color_roof_rem;
            ShadMatWallsRem.uniforms.color.value = init_color_walls_rem;
            ShadMatEdgesRem.uniforms.color.value = init_color_edges_rem;
            ShadMatRoofRem.uniforms.texture_roof.value = init_texture_roof_rem;
            ShadMatWallsRem.uniforms.texture_walls.value = init_texture_walls_rem;
          }
        }
        this.view.notifyChange(layer, true);
    }).bind(this));

    // Third style to be implemented : Antiquated style //

    subfolder_style.add({ Antiquated : false }, 'Antiquated').onChange((function updateStyle(value){       // Detection of an event : the event enables to trigger a function afterwards
        if (value){    // Test if 'value' equals to 'true'
          if (layer.id == 'WFS Buildings'){
            ShadMatWalls.uniforms.mode.value = 1;                              /// Texture mode activated for shader in charge of walls modeling
            ShadMatRoof.uniforms.mode.value = 1;                               /// Texture mode activated for shader in charge of roof modeling
            ShadMatRoof.uniforms.texture_roof.value = tex_slatetile;            /// Texture calling for roof
            ShadMatWalls.uniforms.texture_walls.value = tex_antiquated_wall;   /// Texture calling for walls
            ShadMatEdges.uniforms.color.value = new THREE.Color('grey');       /// Color calling for edges

          } else if (layer.id == 'WFS Buildings Remarquable') {
            ShadMatWallsRem.uniforms.mode.value = 1;                              /// Texture mode activated for shader in charge of walls modeling
            ShadMatRoofRem.uniforms.mode.value = 1;                               /// Texture mode activated for shader in charge of roof modeling
            ShadMatRoofRem.uniforms.texture_roof.value = tex_slatetile;            /// Texture calling for roof
            ShadMatWallsRem.uniforms.texture_walls.value = tex_antiquated_wall;   /// Texture calling for walls
            ShadMatEdgesRem.uniforms.color.value = new THREE.Color('grey');       /// Color calling for edges
          }
        } else {
          // We are coming back to default parameters values
          if (layer.id == 'WFS Buildings'){
            ShadMatWalls.uniforms.mode.value = init_mode_walls;
            ShadMatRoof.uniforms.mode.value = init_mode_roof;
            ShadMatRoof.uniforms.color.value = init_color_roof;
            ShadMatWalls.uniforms.color.value = init_color_walls;
            ShadMatEdges.uniforms.color.value = init_color_edges;
            ShadMatRoof.uniforms.texture_roof.value = init_texture_roof;
            ShadMatWalls.uniforms.texture_walls.value = init_texture_walls;

          } else if (layer.id == 'WFS Buildings Remarquable') {
            ShadMatWallsRem.uniforms.mode.value = init_mode_walls_rem;
            ShadMatRoofRem.uniforms.mode.value = init_mode_roof_rem;
            ShadMatRoofRem.uniforms.color.value = init_color_roof_rem;
            ShadMatWallsRem.uniforms.color.value = init_color_walls_rem;
            ShadMatEdgesRem.uniforms.color.value = init_color_edges_rem;
            ShadMatRoofRem.uniforms.texture_roof.value = init_texture_roof_rem;
            ShadMatWallsRem.uniforms.texture_walls.value = init_texture_walls_rem;
          }
        }
        this.view.notifyChange(layer, true);
    }).bind(this));

    // Fourth style to be implemented : HealthyEnvironment style //

    subfolder_style.add({ HealthyEnvironment : false }, 'HealthyEnvironment').onChange((function updateStyle(value){       // Detection of an event : the event enables to trigger a function afterwards
        if (value){    // Test if 'value' equals to 'true'
          if (layer.id == 'WFS Buildings'){
            ShadMatWalls.uniforms.mode.value = 1;                               /// Texture mode activated for shader in charge of walls modeling
            ShadMatRoof.uniforms.mode.value = 1;                                /// Texture mode activated for shader in charge of roof modeling
            ShadMatRoof.uniforms.texture_roof.value = tex_rooftile;             /// Texture calling for roof
            ShadMatWalls.uniforms.texture_walls.value = tex_clean_wall;         /// Texture calling for walls
            ShadMatEdges.uniforms.color.value = new THREE.Color('grey');        /// Color calling for edges

          } else if (layer.id == 'WFS Buildings Remarquable') {
            ShadMatWallsRem.uniforms.mode.value = 1;                            /// Texture mode activated for shader in charge of walls modeling
            ShadMatRoofRem.uniforms.mode.value = 1;                             /// Texture mode activated for shader in charge of roof modeling
            ShadMatRoofRem.uniforms.texture_roof.value = tex_rooftile;          /// Texture calling for roof
            ShadMatWallsRem.uniforms.texture_walls.value = tex_clean_wall;      /// Texture calling for walls
            ShadMatEdgesRem.uniforms.color.value = new THREE.Color('grey');     /// Color calling for edges
          }
        } else {
          if (layer.id == 'WFS Buildings'){
            // We are coming back to default parameters values
            ShadMatWalls.uniforms.mode.value = init_mode_walls;
            ShadMatRoof.uniforms.mode.value = init_mode_roof;
            ShadMatRoof.uniforms.color.value = init_color_roof;
            ShadMatWalls.uniforms.color.value = init_color_walls;
            ShadMatEdges.uniforms.color.value = init_color_edges;
            ShadMatRoof.uniforms.texture_roof.value = init_texture_roof;
            ShadMatWalls.uniforms.texture_walls.value = init_texture_walls;

          } else if (layer.id == 'WFS Buildings Remarquable') {
            ShadMatWallsRem.uniforms.mode.value = init_mode_walls_rem;
            ShadMatRoofRem.uniforms.mode.value = init_mode_roof_rem;
            ShadMatRoofRem.uniforms.color.value = init_color_roof_rem;
            ShadMatWallsRem.uniforms.color.value = init_color_walls_rem;
            ShadMatEdgesRem.uniforms.color.value = init_color_edges_rem;
            ShadMatRoofRem.uniforms.texture_roof.value = init_texture_roof_rem;
            ShadMatWallsRem.uniforms.texture_walls.value = init_texture_walls_rem;
          }
        }
        this.view.notifyChange(layer, true);
    }).bind(this));

};

////// Function that adds all geometry layers into GUI taking into account shaders ///////

GuiTools.prototype.addGeometryLayersGUI = function addGeometryLayersGUI(layers, ShadMatRoof, ShadMatWalls, ShadMatEdges, ShadMatRoofRem, ShadMatWallsRem, ShadMatEdgesRem) {
    var i;
    for (i = 0; i < layers.length; i++) {
        this.addGeometryLayerGUI(layers[i], ShadMatRoof, ShadMatWalls, ShadMatEdges, ShadMatRoofRem, ShadMatWallsRem, ShadMatEdgesRem);
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////// END OF 3D STYLES IMPLEMENTATION /////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


GuiTools.prototype.removeLayersGUI = function removeLayersGUI(nameLayer) {
    this.colorGui.removeFolder(nameLayer);
};

GuiTools.prototype.addGUI = function addGUI(name, value, callback) {
    this[name] = value;
    this.gui.add(this, name).onChange(callback);
};

GuiTools.prototype.hideFolder = function hideFolder(nameLayer, value) {
    this.colorGui.hideFolder(nameLayer, value);
};

export default GuiTools
