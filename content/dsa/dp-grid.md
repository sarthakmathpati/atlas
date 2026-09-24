---
topic: dsa.dp-grid
name: "Dynamic programming: grids"
subject: dsa
order: 28
prereqs: [dsa.dp-foundations]
---

## dsa.dp-grid.grid-path-dp
name: "Grid path DP"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "unique paths with and without obstacles, minimum path sum"

## dsa.dp-grid.triangle-and-falling-paths
name: "Triangle and falling paths"
importance: important
prereqs: [dsa.dp-grid.grid-path-dp]
scope: "top-down vs bottom-up"

## dsa.dp-grid.square-submatrices
name: "Square submatrices"
importance: important
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-grid.grid-path-dp]
scope: "maximal square, count square submatrices"

## dsa.dp-grid.hard-grid-dp
name: "Hard grid DP"
importance: advanced
prereqs: [dsa.dp-grid.grid-path-dp]
scope: "cherry pickup, dungeon game with reverse DP"
