Got it — that’s a more specific game than a general ball-drop puzzler.

What you’re describing is basically a 3D reflex/aim timing game:

balls are spawned from a fixed drop point in front of the player

several open jars / cups / buckets move in a circular path around a central axis

the player drops balls one at a time

each ball falls under gravity

the goal is to land all X balls into jars before Y seconds runs out

For an LLM, I’d describe it like this:

Core game concept

Build a simple 3D arcade game inspired by Quick Drop. Several jars rotate around a central point on a circular track. The player stands facing the rotating jars and can drop balls from a fixed point above or in front of them. Each dropped ball falls under gravity and can land in a jar if timed correctly. The objective is to get all required balls into the jars before the timer expires.

Core player action

The player has only one main action:

drop a ball now

This makes the gameplay about:

timing

rhythm

anticipation

reading the motion of the rotating jars

Main gameplay loop

Start level

Jars rotate continuously around a center point

Player presses a button to drop a ball

Ball falls straight down from the spawn point

If a jar is under the ball when it reaches jar height, the ball is collected

Repeat until:

all required balls are collected, or

time runs out

World setup
Ball spawn point

fixed point in space

located above the jar ring and slightly toward the player-facing side

each input spawns one ball

optionally prevent a new drop until the previous ball has resolved

Rotating jars

multiple jars arranged around a circle

all jars rotate around a common center

jars keep upright while orbiting

each jar has:

position

opening radius

depth

capacity, optional

collected ball count

Central rotation

jars orbit at a fixed angular speed

can rotate clockwise or counterclockwise

later levels can vary speed or reverse direction

Balls

spheres affected by gravity

dropped from spawn point with near-zero initial velocity

can:

fall into jars

bounce off rims

miss entirely

fall to the floor / fail zone

Win and lose conditions
Win

player gets all X balls into jars before Y seconds

Lose

timer reaches zero before all required balls are scored

optionally also lose if the player runs out of balls

Formalized:

requiredBalls = X

timeLimit = Y

win if scoredBalls >= requiredBalls before timer ends

lose if timer <= 0 and scoredBalls < requiredBalls

Best simplified physics model

You do not need full complex physics to capture the feel.

A good first version:

balls are rigid spheres

jars are cylinders or cup-like trigger volumes

if a falling ball enters the top opening and descends below the rim, count it as scored

missed balls fall into a cleanup zone and disappear

This is much easier than simulating fully realistic cup interiors.

Collision / scoring logic

The most important part is detecting whether a ball lands in a jar.

Simple approach:

Ball falls under gravity

For each jar, check whether ball center is horizontally inside the jar opening

Check whether ball has dropped below rim height

If yes:

mark ball as captured

increment score

attach/hide ball inside jar

remove ball from active simulation

Pseudo-logic:

on each frame:
    update jar orbit positions

    for each active ball:
        apply gravity
        update position

        for each jar:
            if ball is above jar opening
               and horizontal distance to jar center < jarOpeningRadius
               and ball.y <= jarRimHeight:
                   capture ball
                   score += 1

        if ball falls below fail height:
            remove ball
Jar motion model

Each jar can be defined by:

orbit radius

current angle

angular speed

Then position is:

jar.x = center.x + cos(angle) * orbitRadius
jar.z = center.z + sin(angle) * orbitRadius
jar.y = fixedHeight

Each frame:

angle += angularSpeed * dt

That gives the “rotating around a central point” behavior.

Camera model

Use a fixed camera:

facing the rotating jars

slightly elevated

clearly showing the drop point and circular motion

The player should easily judge:

where the ball will fall

when a jar will pass under it

Difficulty knobs

To make levels harder or easier, vary:

number of jars

orbit speed

orbit radius

jar opening size

drop height

number of balls required

time limit

whether jars are evenly spaced or not

whether some jars are decoys or blocked

Minimal version 1 spec

A very simple first version should have:

fixed 3D camera

1 ring of rotating jars

1 fixed ball spawn point

press space / click to drop ball

timer

score counter

win/fail overlay

missed balls removed when they hit a lower cleanup plane