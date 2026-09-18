/* bootstrap: three come modulo ES + loader GLB, poi la pagina */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
window.THREE = THREE; window.GLTFLoader = GLTFLoader; window.DRACOLoader = DRACOLoader; window.RoomEnvironment = RoomEnvironment;
import("./app.js");
