import { useRef, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { initGraphVisualizer } from '../algorithms/graphs/graphVisualizer';
import { initDFSVisualizer } from '../algorithms/graphs/dfsVisualizer';
import { initDijkstraVisualizer } from '../algorithms/graphs/dijkstraVisualizer';
import '../styles/TreeVisualizer.css';

export default function Graphs() {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const { algo } = useParams();

  useEffect(() => {
    if (containerRef.current) {
      if (vizRef.current) {
        vizRef.current.destroy();
        vizRef.current = null;
      }
      
      if (algo === 'bfs') {
        vizRef.current = initGraphVisualizer(containerRef.current);
      } else if (algo === 'dfs') {
        vizRef.current = initDFSVisualizer(containerRef.current);
      } else if (algo === 'dijkstra') {
        vizRef.current = initDijkstraVisualizer(containerRef.current);
      }
    }

    return () => {
      if (vizRef.current) {
        vizRef.current.destroy();
        vizRef.current = null;
      }
    };
  }, [algo]);

  // If no algorithm is specified, redirect to BFS by default
  if (!algo) {
    return <Navigate to="/graphs/bfs" replace />;
  }

  return (
    <div
      ref={containerRef}
      className="tree-page"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
