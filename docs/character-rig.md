# Inkbreak courier character

The original courier is authored procedurally in src/character.ts. It uses a real Three.js Skeleton and SkinnedMesh, not a collection of rotating rigid limb blocks. This is not a Blender-authored asset; it can be replaced with a DCC-authored rig later without changing the game motion contract.

Sixteen named bones drive hips, spine, neck, head, shoulders, elbows, wrists, thighs, knees and feet. Continuous limb topology uses normalized two-bone blend weights around elbows and knees. Idle breathing, running strides and knee flexion, airborne tucking, weapon aiming and recoil are posed by updateAvatar. Swimming switches to an original ink-ray silhouette.

PBR skin, fabric, hair, rubber and accent surfaces share seven materials. The biped uses seven material groups. Identity attachments batch per material, generally adding two or three groups. The default full hierarchy is 21,376 triangles including the hidden swim form; the visible default biped is 19,936. Actual frame rate remains hardware and scene dependent.

setAvatarStyle preserves start.ng identity: primary/secondary/skin/hair colors, male/female body proportions, seven hair choices, five hat choices and six accessory choices. The courier keeps gameplay ink gear in addition to the platform-selected accessory. No Nintendo meshes, textures, characters or animation data are used.

Tests in src/character.test.ts verify normalized continuous weights, actual skinned vertex deformation, swim visibility, color application and finite geometry for all 210 hair/hat/accessory combinations. Browser visual review is still required before asserting the final appearance.

Visual seam review corrected the pelvis overlap, closed limb end caps and added clean sleeve cuffs. A regression test ensures knees flex backward during both running and airborne tuck.
