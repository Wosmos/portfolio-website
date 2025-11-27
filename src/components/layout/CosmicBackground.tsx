'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

const CosmicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const frameIdRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((event: MouseEvent) => {
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }, []);

  const handleResize = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current) return;
    
    const camera = sceneRef.current.children.find(child => child instanceof THREE.PerspectiveCamera) as THREE.PerspectiveCamera;
    if (camera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      alpha: true, 
      antialias: false, // Disable for better performance
      powerPreference: "high-performance"
    });
    rendererRef.current = renderer;
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Optimized particle system - reduced count for better performance
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1500; // Reduced from 2000
    const posArray = new Float32Array(particlesCount * 3);
    const colorsArray = new Float32Array(particlesCount * 3);

    // Pre-calculate initial positions and colors
    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 100;
        colorsArray[i] = Math.random();
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.6, // Reduced opacity for subtlety
        blending: THREE.AdditiveBlending,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    scene.add(camera); // Add camera to scene for easy access

    camera.position.z = 30;

    // Optimized animation loop
    const clock = new THREE.Clock();
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= frameInterval) {
        const elapsedTime = clock.getElapsedTime();

        // Smooth rotation with mouse interaction
        particlesMesh.rotation.y = elapsedTime * 0.03; // Slower rotation
        particlesMesh.rotation.x += (mouseRef.current.y * 0.1 - particlesMesh.rotation.x) * 0.05;
        particlesMesh.rotation.y += (mouseRef.current.x * 0.1 - (particlesMesh.rotation.y - elapsedTime * 0.03)) * 0.05;

        // Optimized wave effect - update every other frame for performance
        if (Math.floor(currentTime / frameInterval) % 2 === 0) {
          const positions = particlesGeometry.attributes.position.array as Float32Array;
          for(let i = 0; i < particlesCount; i++) {
              const i3 = i * 3;
              const x = positions[i3];
              const z = positions[i3 + 2];
              positions[i3 + 1] = Math.sin(elapsedTime * 0.5 + x * 0.01) * Math.cos(elapsedTime * 0.5 + z * 0.01) * 2;
          }
          particlesGeometry.attributes.position.needsUpdate = true;
        }

        renderer.render(scene, camera);
        lastTime = currentTime;
      }
      
      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameIdRef.current);
      
      // Thorough cleanup
      if (particlesGeometry) {
        particlesGeometry.dispose();
      }
      if (particlesMaterial) {
        particlesMaterial.dispose();
      }
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      rendererRef.current = null;
      sceneRef.current = null;
    };
  }, [handleMouseMove, handleResize]);

  return (
    <canvas 
      ref={canvasRef} 
      id="cosmic-canvas" 
      className="fixed inset-0 -z-10 opacity-20 pointer-events-none"
      style={{ willChange: 'transform' }}
    />
  );
};

export default CosmicBackground;
