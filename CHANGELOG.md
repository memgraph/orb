## [1.0.1](https://github.com/memgraph/orb/compare/v1.0.0...v1.0.1) (2026-07-29)


### Fix

* Shaders bundling (#113) ([23efa00](https://github.com/memgraph/orb/commit/23efa00eb17f4ec137b974cfd9f135c834efc766)), closes [#113](https://github.com/memgraph/orb/issues/113)

# [1.0.0](https://github.com/memgraph/orb/compare/v0.4.3...v1.0.0) (2026-07-28)


### Breaking

* Release 1.0.0 with docs site, WebGL renderer and modernized tooling ([19bbf02](https://github.com/memgraph/orb/commit/19bbf02d32b615fab6e2e5b1ac16d23adcf1838e)), closes [#33](https://github.com/memgraph/orb/issues/33) [#34](https://github.com/memgraph/orb/issues/34) [#61](https://github.com/memgraph/orb/issues/61)

### chore

* Update workflows (#106) ([e502ab7](https://github.com/memgraph/orb/commit/e502ab7220ee8f31f378b43b477d782cb7b1c64f)), closes [#106](https://github.com/memgraph/orb/issues/106)

## 0.4.3

* Fix: Color class is incorrectly converting hex to rgb (#85) (fixes #84) - by @rgoewedky

### Fix

* Fix: resizeObserver is not unobserved (#82) (fixes #81) - by @markusnissl

## 0.4.2

### Fix

* Fix: resizeObserver is not unobserved (#82) (fixes #81) - by @markusnissl

## 0.4.1

### Fix

* Add the correct sort for the edge zIndex (#66)
* Fix the spelling issues in the project (#65) - by @jsoref

## 0.4.0

### New

* Add canvas background color (#55)
* Add zIndex style property (#53)

## 0.3.0

### New

* Added support for double click events (#50) - by @shashankshukla96

## 0.2.0

### New

* Add support for context menu events (#46) - by @shashankshukla96

## 0.1.5

### Fix

* Fix web worker build with parcel (#36) - by @jondlm

## 0.1.4

### Fix

* Fix: Remove render callback after first usage in simulation end (#31)

## 0.1.3

### Fix

* Fix: Add throttle render to renderer via fps settings (#29)

## 0.1.2

### Fix

* Fix physics behavior (#26)

### Chore

 * Set dimensions on parent element when undefined (#24)
 * Preserve graph container children (#24)
 * Apply Emitter in simulator and fix cleanup when terminated (#25)
 * Refactor naming in simulator (#25)

## 0.1.1

### Fix

* Fix undefined subject on mouse hover event  (#20)

## 0.1.0 (2022-09-14)

### Fix

* Fix image loading on node style properties (#14)

### Chore

* Add pre commit hook (#11)
* Fix docs and general orb API issues (#13)
