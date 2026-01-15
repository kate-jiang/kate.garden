import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

const config = {
    joints: 4,
    bladeWidth: 0.067,
    bladeHeight: .5,
    width: 100,
    resolution: 64,
    radius: 240,
    instances: 100000,
    elevation: 0.2,
    azimuth: 0.4,
    fogFade: 0.008,
    ambientStrength: 0.7,
    translucencyStrength: 1.5,
    specularStrength: 0.5,
    diffuseStrength: 1.5,
    shininess: 256,
    sunColour: new THREE.Vector3(1.0, 1.0, 1.0),
    specularColour: new THREE.Vector3(1.0, 1.0, 1.0)
};

const delta = config.width / config.resolution;
const pos = new THREE.Vector2(0, 0);
let groundShader = null;

// Initialize
const canvas = document.getElementById('canvas');

// Scenes
const scene = new THREE.Scene();
const backgroundScene = new THREE.Scene();

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;

// Camera
const FOV = 45;
const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 1, 20000);
camera.position.set(-1, 4, 35);
camera.lookAt(new THREE.Vector3(0, 3, 0));
scene.add(camera);
backgroundScene.add(camera);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1, 50);
pointLight.position.set(0, 6, 8);
scene.add(pointLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Textures
const loader = new THREE.TextureLoader();
const grassTexture = loader.load('/textures/blade_diffuse.jpg');
const alphaMap = loader.load('/textures/blade_alpha.jpg');
const noiseTexture = loader.load('/textures/perlinFbm.jpg');
noiseTexture.wrapS = THREE.RepeatWrapping;
noiseTexture.wrapT = THREE.RepeatWrapping;

// Sky Shader
const backgroundMaterial = new THREE.ShaderMaterial({
    uniforms: {
        sunDirection: { type: 'vec3', value: new THREE.Vector3(Math.sin(config.azimuth), Math.sin(config.elevation), -Math.cos(config.azimuth)) },
        resolution: { type: 'vec2', value: new THREE.Vector2(canvas.width, canvas.height) },
        fogFade: { type: 'float', value: config.fogFade },
        fov: { type: 'float', value: FOV }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform vec2 resolution;
        uniform vec3 sunDirection;
        uniform float fogFade;
        uniform float fov;

        const vec3 skyColour = 0.6 * vec3(0.02, 0.2, 0.9);
        vec3 getSkyColour(vec3 rayDir) {
            return mix(0.35 * skyColour, skyColour, pow(1.0 - rayDir.y, 4.0));
        }

        vec3 applyFog(vec3 rgb, vec3 rayOri, vec3 rayDir, vec3 sunDir) {
            float dist = 4000.0;
            if (abs(rayDir.y) < 0.0001) rayDir.y = 0.0001;
            float fogAmount = 1.0 * exp(-rayOri.y * fogFade) * (1.0 - exp(-dist * rayDir.y * fogFade)) / (rayDir.y * fogFade);
            float sunAmount = max(dot(rayDir, sunDir), 0.0);
            vec3 fogColor = mix(vec3(0.35, 0.5, 0.9), vec3(1.0, 1.0, 0.75), pow(sunAmount, 16.0));
            return mix(rgb, fogColor, clamp(fogAmount, 0.0, 1.0));
        }

        vec3 ACESFilm(vec3 x) {
            float a = 2.51;
            float b = 0.03;
            float c = 2.43;
            float d = 0.59;
            float e = 0.14;
            return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }

        vec3 rayDirection(float fieldOfView, vec2 fragCoord) {
            vec2 xy = fragCoord - resolution.xy / 2.0;
            float z = (0.5 * resolution.y) / tan(radians(fieldOfView) / 2.0);
            return normalize(vec3(xy, -z));
        }

        mat3 lookAt(vec3 camera, vec3 at, vec3 up) {
            vec3 zaxis = normalize(at - camera);
            vec3 xaxis = normalize(cross(zaxis, up));
            vec3 yaxis = cross(xaxis, zaxis);
            return mat3(xaxis, yaxis, -zaxis);
        }

        float getGlow(float dist, float radius, float intensity) {
            dist = max(dist, 1e-6);
            return pow(radius / dist, intensity);
        }

        void main() {
            vec3 target = vec3(0.0, 0.0, 0.0);
            vec3 up = vec3(0.0, 1.0, 0.0);
            vec3 rayDir = rayDirection(fov, gl_FragCoord.xy);
            mat3 viewMatrix_ = lookAt(cameraPosition, target, up);
            rayDir = viewMatrix_ * rayDir;
            vec3 col = getSkyColour(rayDir);
            vec3 sunDir = normalize(sunDirection);
            float mu = dot(sunDir, rayDir);
            col += vec3(1.0, 1.0, 0.8) * getGlow(1.0 - mu, 0.00005, 0.9);
            col += applyFog(col, vec3(0, 1000, 0), rayDir, sunDir);
            col = ACESFilm(col);
            col = pow(col, vec3(0.4545));
            gl_FragColor = vec4(col, 1.0);
        }
    `
});
backgroundMaterial.depthWrite = false;
const backgroundGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
backgroundScene.add(background);

// Ground
const groundBaseGeometry = new THREE.PlaneGeometry(config.width, config.width, config.resolution, config.resolution);
groundBaseGeometry.lookAt(new THREE.Vector3(0, 1, 0));
groundBaseGeometry.verticesNeedUpdate = true;

const groundGeometry = new THREE.PlaneGeometry(config.width, config.width, config.resolution, config.resolution);
groundGeometry.setAttribute('basePosition', groundBaseGeometry.getAttribute('position'));
groundGeometry.lookAt(new THREE.Vector3(0, 1, 0));
groundGeometry.verticesNeedUpdate = true;

const groundMaterial = new THREE.MeshPhongMaterial({ color: new THREE.Color('rgb(10%, 25%, 2%)') });

const sharedPrefix = `
uniform sampler2D noiseTexture;
float getYPosition(vec2 p) {
    return 8.0 * (2.0 * texture2D(noiseTexture, p / 800.0).r - 1.0);
}
`;

const groundVertexPrefix = sharedPrefix + `
attribute vec3 basePosition;
uniform float delta;
uniform float posX;
uniform float posZ;
uniform float radius;
uniform float width;

float placeOnSphere(vec3 v) {
    float theta = acos(v.z / radius);
    float phi = acos(v.x / (radius * sin(theta)));
    float sV = radius * sin(theta) * sin(phi);
    if (sV != sV) sV = v.y;
    return sV;
}

vec3 getPosition(vec3 pos, float epsX, float epsZ) {
    vec3 temp;
    temp.x = pos.x + epsX;
    temp.z = pos.z + epsZ;
    temp.y = max(0.0, placeOnSphere(temp)) - radius;
    temp.y += getYPosition(vec2(basePosition.x + epsX + delta * floor(posX), basePosition.z + epsZ + delta * floor(posZ)));
    return temp;
}

vec3 getNormal(vec3 pos) {
    float eps = 1e-1;
    vec3 tempP = getPosition(pos, eps, 0.0);
    vec3 tempN = getPosition(pos, -eps, 0.0);
    vec3 slopeX = tempP - tempN;
    tempP = getPosition(pos, 0.0, eps);
    tempN = getPosition(pos, 0.0, -eps);
    vec3 slopeZ = tempP - tempN;
    vec3 norm = normalize(cross(slopeZ, slopeX));
    return norm;
}
`;

groundMaterial.onBeforeCompile = function(shader) {
    shader.uniforms.delta = { value: delta };
    shader.uniforms.posX = { value: pos.x };
    shader.uniforms.posZ = { value: pos.y };
    shader.uniforms.radius = { value: config.radius };
    shader.uniforms.width = { value: config.width };
    shader.uniforms.noiseTexture = { value: noiseTexture };
    shader.vertexShader = groundVertexPrefix + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `vec3 pos = vec3(0);
        pos.x = basePosition.x - mod(mod((delta * posX), delta) + delta, delta);
        pos.z = basePosition.z - mod(mod((delta * posZ), delta) + delta, delta);
        pos.y = max(0.0, placeOnSphere(pos)) - radius;
        pos.y += getYPosition(vec2(basePosition.x + delta * floor(posX), basePosition.z + delta * floor(posZ)));
        vec3 objectNormal = getNormal(pos);
        #ifdef USE_TANGENT
        vec3 objectTangent = vec3(tangent.xyz);
        #endif`
    );
    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(pos);`
    );
    groundShader = shader;
};

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.geometry.computeVertexNormals();
scene.add(ground);

// Grass
const grassVertexSource = sharedPrefix + `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
attribute vec3 offset;
attribute vec2 uv;
attribute vec2 halfRootAngle;
attribute float scale;
attribute float index;
uniform float time;

uniform float delta;
uniform float posX;
uniform float posZ;
uniform float radius;
uniform float width;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float frc;
varying float idx;

const float PI = 3.1415;
const float TWO_PI = 2.0 * PI;

vec3 rotateVectorByQuaternion(vec3 v, vec4 q) {
    return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
}

float placeOnSphere(vec3 v) {
    float theta = acos(v.z / radius);
    float phi = acos(v.x / (radius * sin(theta)));
    float sV = radius * sin(theta) * sin(phi);
    if (sV != sV) sV = v.y;
    return sV;
}

void main() {
    frc = position.y / float(${config.bladeHeight});
    vec3 vPosition = position;
    vPosition.y *= scale;
    vNormal = normal;
    vNormal.y /= scale;
    vec4 direction = vec4(0.0, halfRootAngle.x, 0.0, halfRootAngle.y);
    vPosition = rotateVectorByQuaternion(vPosition, direction);
    vNormal = rotateVectorByQuaternion(vNormal, direction);
    vUv = uv;

    vec3 pos;
    vec3 globalPos;
    vec3 tile;

    globalPos.x = offset.x - posX * delta;
    globalPos.z = offset.z - posZ * delta;

    tile.x = floor((globalPos.x + 0.5 * width) / width);
    tile.z = floor((globalPos.z + 0.5 * width) / width);

    pos.x = globalPos.x - tile.x * width;
    pos.z = globalPos.z - tile.z * width;

    pos.y = max(0.0, placeOnSphere(pos)) - radius;
    pos.y += getYPosition(vec2(pos.x + delta * posX, pos.z + delta * posZ));

    vec2 fractionalPos = 0.5 + offset.xz / width;
    fractionalPos *= TWO_PI;

    float noise = 0.5 + 0.5 * sin(fractionalPos.x + time);
    float halfAngle = -noise * 0.1;
    noise = 0.5 + 0.5 * cos(fractionalPos.y + time);
    halfAngle -= noise * 0.05;

    direction = normalize(vec4(sin(halfAngle), 0.0, -sin(halfAngle), cos(halfAngle)));

    vPosition = rotateVectorByQuaternion(vPosition, direction);
    vNormal = rotateVectorByQuaternion(vNormal, direction);
    vPosition += pos;

    idx = index;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
}`;

const grassFragmentSource = `
precision mediump float;
uniform vec3 cameraPosition;
uniform float ambientStrength;
uniform float diffuseStrength;
uniform float specularStrength;
uniform float translucencyStrength;
uniform float shininess;
uniform vec3 lightColour;
uniform vec3 sunDirection;
uniform sampler2D map;
uniform sampler2D alphaMap;
uniform vec3 specularColour;

varying float frc;
varying float idx;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
    if (texture2D(alphaMap, vUv).r < 0.15) discard;

    vec3 normal;
    if (gl_FrontFacing) normal = normalize(vNormal);
    else normal = normalize(-vNormal);

    vec3 textureColour = pow(texture2D(map, vUv).rgb, vec3(2.2));
    vec3 mixColour = idx > 0.75 ? vec3(0.2, 0.8, 0.06) : vec3(0.5, 0.8, 0.08);
    textureColour = mix(0.1 * mixColour, textureColour, 0.75);

    vec3 lightTimesTexture = lightColour * textureColour;
    vec3 ambient = textureColour;
    vec3 lightDir = normalize(sunDirection);

    float dotNormalLight = dot(normal, lightDir);
    float diff = max(dotNormalLight, 0.0);
    vec3 diffuse = diff * lightTimesTexture;

    float sky = max(dot(normal, vec3(0, 1, 0)), 0.0);
    vec3 skyLight = sky * vec3(0.12, 0.29, 0.55);

    vec3 viewDirection = normalize(cameraPosition - vPosition);
    vec3 halfwayDir = normalize(lightDir + viewDirection);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
    vec3 specular = spec * specularColour * lightColour;

    vec3 diffuseTranslucency = vec3(0);
    vec3 forwardTranslucency = vec3(0);
    float dotViewLight = dot(-lightDir, viewDirection);
    if (dotNormalLight <= 0.0) {
        diffuseTranslucency = lightTimesTexture * translucencyStrength * -dotNormalLight;
        if (dotViewLight > 0.0) {
            forwardTranslucency = lightTimesTexture * translucencyStrength * pow(dotViewLight, 16.0);
        }
    }

    vec3 col = 0.3 * skyLight * textureColour + ambientStrength * ambient + diffuseStrength * diffuse + specularStrength * specular + diffuseTranslucency + forwardTranslucency;
    col = mix(0.35 * vec3(0.1, 0.25, 0.02), col, frc);
    col = ACESFilm(col);
    col = pow(col, vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}`;

const grassBaseGeometry = new THREE.PlaneGeometry(config.bladeWidth, config.bladeHeight, 1, config.joints);
grassBaseGeometry.translate(0, config.bladeHeight / 2, 0);

const vertex = new THREE.Vector3();
const quaternion0 = new THREE.Quaternion();
const quaternion1 = new THREE.Quaternion();
const quaternion2 = new THREE.Quaternion();

let angle = 0.05;
let sinAngle = Math.sin(angle / 2.0);
let rotationAxis = new THREE.Vector3(0, 1, 0);
quaternion0.set(rotationAxis.x * sinAngle, rotationAxis.y * sinAngle, rotationAxis.z * sinAngle, Math.cos(angle / 2.0));

angle = 0.3;
sinAngle = Math.sin(angle / 2.0);
rotationAxis.set(1, 0, 0);
quaternion1.set(rotationAxis.x * sinAngle, rotationAxis.y * sinAngle, rotationAxis.z * sinAngle, Math.cos(angle / 2.0));
quaternion0.multiply(quaternion1);

angle = 0.1;
sinAngle = Math.sin(angle / 2.0);
rotationAxis.set(0, 0, 1);
quaternion1.set(rotationAxis.x * sinAngle, rotationAxis.y * sinAngle, rotationAxis.z * sinAngle, Math.cos(angle / 2.0));
quaternion0.multiply(quaternion1);

for (let v = 0; v < grassBaseGeometry.attributes.position.array.length; v += 3) {
    quaternion2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    vertex.x = grassBaseGeometry.attributes.position.array[v];
    vertex.y = grassBaseGeometry.attributes.position.array[v + 1];
    vertex.z = grassBaseGeometry.attributes.position.array[v + 2];
    const frac = vertex.y / config.bladeHeight;
    quaternion2.slerp(quaternion0, frac);
    vertex.applyQuaternion(quaternion2);
    grassBaseGeometry.attributes.position.array[v] = vertex.x;
    grassBaseGeometry.attributes.position.array[v + 1] = vertex.y;
    grassBaseGeometry.attributes.position.array[v + 2] = vertex.z;
}
grassBaseGeometry.computeVertexNormals();

const instancedGeometry = new THREE.InstancedBufferGeometry();
instancedGeometry.index = grassBaseGeometry.index;
instancedGeometry.attributes.position = grassBaseGeometry.attributes.position;
instancedGeometry.attributes.uv = grassBaseGeometry.attributes.uv;
instancedGeometry.attributes.normal = grassBaseGeometry.attributes.normal;

const indices = [];
const offsets = [];
const scales = [];
const halfRootAngles = [];

for (let i = 0; i < config.instances; i++) {
    indices.push(i / config.instances);
    const x = Math.random() * config.width - config.width / 2;
    const z = Math.random() * config.width - config.width / 2;
    offsets.push(x, 0, z);
    const angle = Math.PI - Math.random() * (2 * Math.PI);
    halfRootAngles.push(Math.sin(0.5 * angle), Math.cos(0.5 * angle));
    scales.push(i % 3 !== 0 ? 2.0 + Math.random() * 1.25 : 2.0 + Math.random());
}

const offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3);
const scaleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(scales), 1);
const halfRootAngleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngles), 2);
const indexAttribute = new THREE.InstancedBufferAttribute(new Float32Array(indices), 1);

instancedGeometry.setAttribute('offset', offsetAttribute);
instancedGeometry.setAttribute('scale', scaleAttribute);
instancedGeometry.setAttribute('halfRootAngle', halfRootAngleAttribute);
instancedGeometry.setAttribute('index', indexAttribute);

const grassMaterial = new THREE.RawShaderMaterial({
    uniforms: {
        time: { type: 'float', value: 0 },
        delta: { type: 'float', value: delta },
        posX: { type: 'float', value: pos.x },
        posZ: { type: 'float', value: pos.y },
        radius: { type: 'float', value: config.radius },
        width: { type: 'float', value: config.width },
        map: { value: grassTexture },
        alphaMap: { value: alphaMap },
        noiseTexture: { value: noiseTexture },
        sunDirection: { type: 'vec3', value: new THREE.Vector3(Math.sin(config.azimuth), Math.sin(config.elevation), -Math.cos(config.azimuth)) },
        cameraPosition: { type: 'vec3', value: camera.position },
        ambientStrength: { type: 'float', value: config.ambientStrength },
        translucencyStrength: { type: 'float', value: config.translucencyStrength },
        diffuseStrength: { type: 'float', value: config.diffuseStrength },
        specularStrength: { type: 'float', value: config.specularStrength },
        shininess: { type: 'float', value: config.shininess },
        lightColour: { type: 'vec3', value: config.sunColour },
        specularColour: { type: 'vec3', value: config.specularColour }
    },
    vertexShader: grassVertexSource,
    fragmentShader: grassFragmentSource,
    side: THREE.DoubleSide
});

const grass = new THREE.Mesh(instancedGeometry, grassMaterial);
scene.add(grass);

// Floating Text "kate"
const fontLoader = new FontLoader();
fontLoader.load('/fonts/helvetiker_regular.typeface.json', function(font) {
    const textGeometry = new TextGeometry('kate', {
        font: font,
        size: 1.5,
        height: 0.3,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 3
    });

    textGeometry.computeBoundingBox();
    const xOffset = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
    textGeometry.translate(xOffset, 0, 0);

    const textMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, 3, 0);
    textMesh.name = 'floatingText';
    scene.add(textMesh);
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    backgroundMaterial.uniforms.resolution.value = new THREE.Vector2(canvas.width, canvas.height);
    backgroundMaterial.uniforms.fov.value = FOV;
});

// Animation loop
let time = 0;
let lastFrame = performance.now();

function animate() {
    const now = performance.now();
    const dt = (now - lastFrame) / 1000;
    lastFrame = now;
    time += dt;

    grassMaterial.uniforms.time.value = time;

    const text = scene.getObjectByName('floatingText');
    if (text) {
        text.position.y = 3 + Math.sin(time * 1.5) * 0.15;
        text.rotation.y = Math.sin(time * 0.8) * 0.1;
    }

    renderer.clear();
    renderer.render(backgroundScene, camera);
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
}

animate();
