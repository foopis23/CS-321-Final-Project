# A Non-Euclidean Game Demo 
A small 3D puzzle game demo inspired by games such as Manifold Garden and Antichamber. This game was made for my final project in my CS-321 Computer Grahpics Course. Also, I know this isn't true Non-Euclidean Geomtry. That was not my goal, I just want to provide an experience using smoke and mirros to emulate that kind of environment. 

## Controls
| Description            | Control        |
|------------------------|----------------|
| Forward                | W or Up Arrow  |
| Look                   | Mouse Movement |
| Interact               | F              |
| Toggle Performance GUI | P              |
| Toggle Flat Shading    | [              |
| Toggle Wireframe       | ]              |

## Goal
This is just a demo with one example puzzle. The goal for now is just to figure out how to locate/open the portal to the next area (this portal is represented by a flat surface that just says portal to next area on it because I never got to making the portal). 

## About
Project Presentation and Demo: https://youtu.be/oYlpWvCKpRU (has puzzle solution in the video)

Project Website: https://foopis23.github.io/Non-Euclidean-Game-Demo/

## Exposed Command line Variables
In this project I left a lot of the code exposed to the global scope for debugging, but also because its just kind of fun to play arouynd with that stuff. To use this you can just open the browser console (f12) and type in commands.

### Some Basic Use Commands

Enabling Fly Mode:
```js
controls.fly = true;
```

Changing player Movement and Look Speed: 
```js
//set movementSpeed of player to 20 (default is 5)
controls.movementSpeed = 20;

//set look sensitivity (default is 10)
controls.lookSpeed = 5;
```

Enable Extra Post-Processing: 
```js
//enable Bloom
bloomPlass.enabled = true;

//enable Ambient Occlusion
saoPass.enabled = true;
```
Teleport Player:
- Arguments: x, y, z, isXRel, isYRel, isZRel
- Setting isXRel to true will make it so x is added to current location instead of setting x location
```js
//teleports player to currentX+0, 600, currentZ+0
controls.teleport(0, 600, 0, true, false, true)
```

### List of Exposed Variables
```
scene : THREE.Scene
rootElement : HtmlDOMElement
canvasElement : HtmlCanvasElement
renderer : THREE.WebGLRenderer
camera : THREE.PerspectiveCamera
controls : PlayerController (internal class)
clock : THREE.Clock
physicsWorld: Ammo.btDiscreteDynamicsWorld
rigidBodies: THREE.Object3D[] //a list of all Object3D that have rididBodies in their userData
composer : THREE.Composer
renderPass : THREE.RenderPass
saoPass : THREE.SaoPass
glitchPass : THREE.GlitchPass
bloomPass : THREE.UnrealBloomPass
triggers : TriggerZone[]; (internal class)
directionalLight : THREE.DirectioanLight
stats : Stats; //performance stats library class
performanceMode : number; //create performance mode being displayed
```
