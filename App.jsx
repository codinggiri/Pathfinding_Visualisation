// ============================================================
// App.jsx — Pathfinding Visualizer
// Main component — grid banata hai, user interaction handle karta hai,
// algorithms run karta hai, aur animation dikhata hai
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { bfs, dfs, dijkstra, astar } from "./algorithms";
import "./App.css";

// ─── GRID SETTINGS ───────────────────────────────────────────
const ROWS = 20;
const COLS = 50;
const START_ROW = 10;
const START_COL = 5;
const END_ROW = 10;
const END_COL = 44;

// ─── NODE FACTORY ────────────────────────────────────────────
// Har cell ek node object hai — ye uski default state hai
function createNode(row, col) {
  return {
    row,
    col,
    isStart: row === START_ROW && col === START_COL,
    isEnd: row === END_ROW && col === END_COL,
    isWall: false,
    isVisited: false,
    distance: Infinity,    // Dijkstra ke liye
    heuristic: 0,          // A* ke liye
    previousNode: null,    // path reconstruct karne ke liye
  };
}

// ─── GRID FACTORY ────────────────────────────────────────────
// Puri 2D grid banata hai
function createInitialGrid() {
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => createNode(row, col))
  );
}

// ─── DEEP CLONE GRID ─────────────────────────────────────────
// React mein state directly mutate nahi karte — isliye clone karte hain
function cloneGrid(grid) {
  return grid.map(row => row.map(node => ({ ...node })));
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function App() {
  const [grid, setGrid] = useState(createInitialGrid);
  const [algorithm, setAlgorithm] = useState("bfs");
  const [speed, setSpeed] = useState(20);         // ms per animation step
  const [isRunning, setIsRunning] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [stats, setStats] = useState({ visited: 0, path: 0, done: false });

  // Mouse events: wall draw karne ke liye click+drag support
  const handleMouseDown = (row, col) => {
    if (isRunning) return;
    setIsMouseDown(true);
    toggleWall(row, col);
  };

  const handleMouseEnter = (row, col) => {
    if (!isMouseDown || isRunning) return;
    toggleWall(row, col);
  };

  const handleMouseUp = () => setIsMouseDown(false);

  // Wall toggle — start/end node pe wall nahi banta
  const toggleWall = (row, col) => {
    setGrid(prev => {
      const newGrid = cloneGrid(prev);
      const node = newGrid[row][col];
      if (node.isStart || node.isEnd) return prev; // start/end protect karo
      node.isWall = !node.isWall;
      return newGrid;
    });
  };

  // ─── RESET ───────────────────────────────────────────────
  const reset = () => {
    setIsRunning(false);
    setStats({ visited: 0, path: 0, done: false });

    // DOM pe directly CSS classes hata do (animation cells clear karne ke liye)
    // React re-render se slow hoga, isliye DOM manipulation yahan theek hai
    document.querySelectorAll(".cell").forEach(cell => {
      cell.classList.remove("visited", "path", "visiting");
    });

    setGrid(createInitialGrid());
  };

  // ─── VISUALIZE ───────────────────────────────────────────
  const visualize = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setStats({ visited: 0, path: 0, done: false });

    // Pahle DOM clear karo (sirf visited/path, walls nahi)
    document.querySelectorAll(".cell.visited, .cell.path").forEach(c => {
      c.classList.remove("visited", "path");
    });

    // Algorithm ke liye fresh grid clone karo (isVisited reset, distances reset)
    const freshGrid = grid.map(row =>
      row.map(node => ({
        ...node,
        isVisited: false,
        distance: Infinity,
        heuristic: 0,
        previousNode: null,
      }))
    );

    const startNode = freshGrid[START_ROW][START_COL];
    const endNode = freshGrid[END_ROW][END_COL];

    // Algorithm choose karo
    const algorithms = { bfs, dfs, dijkstra, astar };
    const { visitedNodesInOrder, shortestPath } = algorithms[algorithm](
      freshGrid, startNode, endNode
    );

    // ─── ANIMATION ──────────────────────────────────────────
    // Visited nodes ko ek ek karke animate karo
    visitedNodesInOrder.forEach((node, i) => {
      setTimeout(() => {
        const cell = document.getElementById(`cell-${node.row}-${node.col}`);
        if (cell && !node.isStart && !node.isEnd) {
          cell.classList.add("visited");
        }

        // Saare visited nodes animate ho gaye → path animate karo
        if (i === visitedNodesInOrder.length - 1) {
          setStats(s => ({ ...s, visited: visitedNodesInOrder.length }));

          if (shortestPath.length === 0) {
            setIsRunning(false);
            setStats({ visited: visitedNodesInOrder.length, path: 0, done: true });
            return;
          }

          animatePath(shortestPath, visitedNodesInOrder.length);
        }
      }, i * speed);
    });
  }, [grid, algorithm, speed, isRunning]);

  // Path animation — visited nodes ke baad chalta hai
  const animatePath = (shortestPath, visitedCount) => {
    shortestPath.forEach((node, i) => {
      setTimeout(() => {
        const cell = document.getElementById(`cell-${node.row}-${node.col}`);
        if (cell && !node.isStart && !node.isEnd) {
          cell.classList.remove("visited");
          cell.classList.add("path");
        }

        if (i === shortestPath.length - 1) {
          setIsRunning(false);
          setStats({ visited: visitedCount, path: shortestPath.length, done: true });
        }
      }, i * (speed * 2)); // path animation thodi slow karo
    });
  };

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <div className="app" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

      {/* HEADER */}
      <header className="header">
        <h1>Pathfinding Visualizer</h1>
        <p className="subtitle">Click/drag to draw walls. Pick an algorithm and press Visualize.</p>
      </header>

      {/* TOOLBAR */}
      <div className="toolbar">

        {/* Algorithm select */}
        <div className="control-group">
          <label>Algorithm</label>
          <select
            value={algorithm}
            onChange={e => setAlgorithm(e.target.value)}
            disabled={isRunning}
          >
            <option value="bfs">BFS (Breadth First Search)</option>
            <option value="dfs">DFS (Depth First Search)</option>
            <option value="dijkstra">Dijkstra's Algorithm</option>
            <option value="astar">A* (A-Star)</option>
          </select>
        </div>

        {/* Speed slider */}
        <div className="control-group">
          <label>Speed: {speed <= 10 ? "Fast" : speed <= 30 ? "Medium" : "Slow"}</label>
          <input
            type="range"
            min={5}
            max={100}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            disabled={isRunning}
          />
        </div>

        {/* Buttons */}
        <button
          className="btn btn-primary"
          onClick={visualize}
          disabled={isRunning}
        >
          {isRunning ? "Running..." : "▶ Visualize"}
        </button>

        <button
          className="btn btn-secondary"
          onClick={reset}
          disabled={isRunning}
        >
          Reset
        </button>
      </div>

      {/* STATS BAR */}
      <div className="stats-bar">
        <span className="legend start-legend">▶ Start</span>
        <span className="legend end-legend">◼ End</span>
        <span className="legend visited-legend">● Visited: {stats.visited}</span>
        <span className="legend path-legend">● Path: {stats.path}</span>
        {stats.done && stats.path === 0 && (
          <span className="legend no-path">No path found!</span>
        )}
        {stats.done && stats.path > 0 && (
          <span className="legend found">Path found!</span>
        )}
      </div>

      {/* ALGORITHM INFO */}
      <div className="algo-info">
        {algorithm === "bfs" && "BFS: Guaranteed shortest path. Explores all neighbours level by level."}
        {algorithm === "dfs" && "DFS: No path guarantee. Explores one direction deep first."}
        {algorithm === "dijkstra" && "Dijkstra: Shortest path with weights. Here all edges = 1, so behaves like BFS."}
        {algorithm === "astar" && "A*: Uses Manhattan distance heuristic to reach end faster than Dijkstra."}
      </div>

      {/* GRID */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {grid.map(row =>
          row.map(node => (
            <div
              key={`${node.row}-${node.col}`}
              id={`cell-${node.row}-${node.col}`}
              className={[
                "cell",
                node.isStart ? "start" : "",
                node.isEnd   ? "end"   : "",
                node.isWall  ? "wall"  : "",
              ].join(" ")}
              onMouseDown={() => handleMouseDown(node.row, node.col)}
              onMouseEnter={() => handleMouseEnter(node.row, node.col)}
            />
          ))
        )}
      </div>

    </div>
  );
}


