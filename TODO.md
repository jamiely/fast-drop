# TODO

- [x] Add a debug toggle for the center diameter
- [x] Add a toggle to disable outer ring LED
- [x] the center dome should reflect some of the lights of the outer ring. we could do this with shaders?
- [x] in storybook, the outer ring doesn't have led effects. it should have the same controls as the debug menu
- [x] when debug mode is enabled, allow me to use scroll to zoom in/out
- [x] when I'm experimenting with lighting in debug mode, i want to be able to see the light source in the scene (if applicable)

- [x] Show the current value set for the controls in the debug menu, so that I can share it.
- [x] Allow me to reposition the light sources in debug mode. I also want to change the type of lighting, and create new lights. Make sure to show information about the lights so I can share and we can codify.
- [x] Add outer ring diameter to debug controls and as a new storybook story.
- [x] Add jar spin speed to the debug controls, and add a new story that shows all the jars spinner so I can try it out.
- [x] Add the Round complete dialog to storybook as a new story.
- [x] Balls should collide with the sides of the jar
- [x] the outer ring should have an led chase effect (moving, multi-color)

Completed in 2026-03-14 pass:

- [x] Allow clicking anywhere on the page to drop
- [x] Press enter/space to play again
- [x] Add an outer ring around the jars for decoration (reference: `example2.png`)
- [x] Add a material polish pass + lighting update:
  - center reads as gleaming metal
  - jars read as glass
  - balls read as red rubber
- [x] End the game as soon as balls run out
- [x] Add a ball size selector and drop height control to the debug panel
- [x] add ball throttler (drop cooldown)
- [x] set ball diameter to 0.157 reference (relative to jar diameter scaling)
- [x] remove outer arcade enclosure
- [x] add instructions for camera/debug toggles (`?debug=1`)
