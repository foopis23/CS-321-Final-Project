# Report

## Graphics Environment 
The two envoirments I was trying to make was the forest area and this space/void like area.

The forest area is a small areas, surrounded by trees, with a box in the center. The idea is that when you walk in the box, and then turn around it is suppose to look like everything just changed magically behgind you. Most of the time the illusion works, but when performance is a bit lower it can snag on this part. How that works is it just teleport, but I use a relative teleport on the x and z, and a static teleport on the y. 

![Forest](https://raw.githubusercontent.com/foopis23/Non-Euclidean-Game-Demo/master/report/forest.png)

The space/void area is a black void with a sort of hologram bridge thing. When you look all around you there are little dots that are suppose to like stars or something. I don't know, I was just really inspired my Super Mario Galaxy. I used a particle system to achieve this. There is a button there and a somewhat strange sign. It seems to just be text floating in the air. That was the goal at least.

![Forest](https://raw.githubusercontent.com/foopis23/Non-Euclidean-Game-Demo/master/report/void.png)

Finally when falling through the void, its either suppose to look like you are falling infinitly or you are falling back into atmosphere.

## Graphics Techniques
- Basic Transforms: scaling, translating, and rotating for player controls, player teleporting, and forest generation
- Wireframe: If you press ] in the game it toggles wireframe mode
- Smooth Shading vs. Flat Shading: If you press [ it toggles the shading mode
- Hidden Surfrace removal: ThreeJS has hidden surface removal built in
- Perspective Camera: The camera is a projection camera
- Obj Files exported from blender: I modeled the three in blender and added to the scene
- Lighting (ambient, specular, diffuse, and point lighting): All of these light sources are used in this project
- Texture Mapping: I used texture mapping for the two signs that appear in the game
- Shadow Maps: I used shadow maps to add shadows to my scene
- Post Processing: I have post processing effects that can be enabled and some that are triggered from game events
