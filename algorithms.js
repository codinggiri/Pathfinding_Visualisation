// ============================================================
// algorithms.js — Pathfinding Logic
// Har algorithm ek object return karta hai:
//   { visitedNodesInOrder: [...], shortestPath: [...] }
//
// visitedNodesInOrder → animation ke liye (visited cells blue dikhte hain)
// shortestPath        → final path (yellow highlight)
// ============================================================

// ─── HELPER: neighbours of a cell ───────────────────────────
// Grid mein ek cell ke upar/neeche/left/right wale cells
function getNeighbours(node, grid) {
  const { row, col } = node;
  const neighbours = [];
  const rows = grid.length;
  const cols = grid[0].length;

  if (row > 0)        neighbours.push(grid[row - 1][col]); // upar
  if (row < rows - 1) neighbours.push(grid[row + 1][col]); // neeche
  if (col > 0)        neighbours.push(grid[row][col - 1]); // left
  if (col < cols - 1) neighbours.push(grid[row][col + 1]); // right

  // sirf unvisited aur non-wall neighbours lenge
  return neighbours.filter(n => !n.isVisited && !n.isWall);
}

// ─── HELPER: path reconstruct karna ──────────────────────────
// End node se start tak previousNode chain follow karo
function getShortestPath(endNode) {
  const path = [];
  let current = endNode;
  while (current !== null) {
    path.unshift(current); // front mein add karo (reverse order se bachne ke liye)
    current = current.previousNode;
  }
  return path;
}

// ============================================================
// 1. BFS — Breadth First Search
//    Guaranteed shortest path (unweighted graph mein)
//    Queue (FIFO) use karta hai
// ============================================================
export function bfs(grid, startNode, endNode) {
  const visitedNodesInOrder = [];
  const queue = [startNode];
  startNode.isVisited = true;

  while (queue.length > 0) {
    const current = queue.shift(); // queue ka pehla element nikalo

    // wall mila toh skip karo
    if (current.isWall) continue;

    visitedNodesInOrder.push(current);

    // end mil gaya!
    if (current === endNode) {
      return {
        visitedNodesInOrder,
        shortestPath: getShortestPath(endNode),
      };
    }

    // neighbours queue mein daalo
    const neighbours = getNeighbours(current, grid);
    for (const neighbour of neighbours) {
      neighbour.isVisited = true;
      neighbour.previousNode = current; // path track karne ke liye
      queue.push(neighbour);
    }
  }

  // end tak path nahi mila
  return { visitedNodesInOrder, shortestPath: [] };
}

// ============================================================
// 2. DFS — Depth First Search
//    Shortest path guarantee NAHI karta
//    Stack (LIFO) use karta hai — ek direction mein jaata rehta hai
// ============================================================
export function dfs(grid, startNode, endNode) {
  const visitedNodesInOrder = [];
  const stack = [startNode];

  while (stack.length > 0) {
    const current = stack.pop(); // stack ka top element nikalo

    if (current.isWall || current.isVisited) continue;

    current.isVisited = true;
    visitedNodesInOrder.push(current);

    if (current === endNode) {
      return {
        visitedNodesInOrder,
        shortestPath: getShortestPath(endNode),
      };
    }

    const neighbours = getNeighbours(current, grid);
    for (const neighbour of neighbours) {
      if (!neighbour.isVisited) {
        neighbour.previousNode = current;
        stack.push(neighbour);
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [] };
}

// ============================================================
// 3. DIJKSTRA
//    Weighted graph ke liye best (hum unweighted use kar rahe hain
//    toh BFS jaisa behave karega, lekin concept sikhna zaroori hai)
//    Min-distance wala node pehle process karta hai
// ============================================================
export function dijkstra(grid, startNode, endNode) {
  const visitedNodesInOrder = [];
  startNode.distance = 0;

  // Saare nodes ek list mein
  const unvisitedNodes = getAllNodes(grid);

  while (unvisitedNodes.length > 0) {
    // Distance ke hisab se sort karo (min-heap ki jagah simple sort)
    sortNodesByDistance(unvisitedNodes);

    const current = unvisitedNodes.shift(); // sabse kam distance wala

    if (current.isWall) continue;
    if (current.distance === Infinity) break; // baaki nodes unreachable hain

    current.isVisited = true;
    visitedNodesInOrder.push(current);

    if (current === endNode) {
      return {
        visitedNodesInOrder,
        shortestPath: getShortestPath(endNode),
      };
    }

    updateNeighbourDistances(current, grid);
  }

  return { visitedNodesInOrder, shortestPath: [] };
}

function getAllNodes(grid) {
  const nodes = [];
  for (const row of grid) {
    for (const node of row) {
      nodes.push(node);
    }
  }
  return nodes;
}

function sortNodesByDistance(nodes) {
  nodes.sort((a, b) => a.distance - b.distance);
}

function updateNeighbourDistances(node, grid) {
  const neighbours = getNeighbours(node, grid);
  for (const neighbour of neighbours) {
    // har edge ka weight 1 hai (unweighted grid)
    const newDist = node.distance + 1;
    if (newDist < neighbour.distance) {
      neighbour.distance = newDist;
      neighbour.previousNode = node;
    }
  }
}

// ============================================================
// 4. A* (A-Star)
//    Sabse smart algorithm — heuristic use karta hai
//    f(n) = g(n) + h(n)
//    g(n) = start se current node tak actual distance
//    h(n) = current se end tak estimated distance (Manhattan distance)
//    End node ki direction mein prefer karta hai → faster than Dijkstra
// ============================================================
export function astar(grid, startNode, endNode) {
  const visitedNodesInOrder = [];
  startNode.distance = 0;
  startNode.heuristic = manhattanDistance(startNode, endNode);

  const openSet = [startNode]; // explore karne wale nodes

  while (openSet.length > 0) {
    // f = g + h ke basis pe sort karo
    openSet.sort((a, b) => (a.distance + a.heuristic) - (b.distance + b.heuristic));

    const current = openSet.shift();

    if (current.isWall) continue;
    if (current.isVisited) continue;

    current.isVisited = true;
    visitedNodesInOrder.push(current);

    if (current === endNode) {
      return {
        visitedNodesInOrder,
        shortestPath: getShortestPath(endNode),
      };
    }

    const neighbours = getNeighbours(current, grid);
    for (const neighbour of neighbours) {
      const tentativeG = current.distance + 1;
      if (tentativeG < neighbour.distance) {
        neighbour.distance = tentativeG;
        neighbour.heuristic = manhattanDistance(neighbour, endNode);
        neighbour.previousNode = current;
        if (!openSet.includes(neighbour)) {
          openSet.push(neighbour);
        }
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [] };
}

// Manhattan Distance: |row1-row2| + |col1-col2|
// Diagonal movement nahi hai toh yahi best heuristic hai
function manhattanDistance(nodeA, nodeB) {
  return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}
