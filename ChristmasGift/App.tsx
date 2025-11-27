import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import ParticleScene from './components/ParticleScene';
import HandTracker from './components/HandTracker';
import GiftOverlay from './components/GiftOverlay';
import { TreeState } from './types';
import * as THREE from 'three';

// --- ICONS ---
const TreeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2L4 12h5l-4 8h14l-4-8h5L12 2z"/>
  </svg>
);

const ScatterIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
    <circle cx="12" cy="5" r="1" />
    <path d="M16.9 16.9l-2.1-2.1M7.1 7.1l2.1 2.1M16.9 7.1l-2.1 2.1M7.1 16.9l2.1-2.1" strokeLinecap="round"/>
  </svg>
);

// --- CAMERA RIG COMPONENT ---
// This component overrides the camera position when hands are detected
const CameraRig: React.FC<{ detected: boolean; targetHeight: number }> = ({ detected, targetHeight }) => {
  const { camera } = useThree();
  const vec = new THREE.Vector3();
  const currentHeightRef = useRef(1); // Default initial camera height relative
  
  useFrame((state, delta) => {
    if (detected) {
      // 1. Map normalized targetHeight (0..1) to Camera World Y
      // LOGIC UPDATE:
      // Hand UP (1.0)   -> Camera LOW (-6)  -> Look UP (仰视)
      // Hand MID (0.5)  -> Camera MID (1)   -> Front View (正视)
      // Hand DOWN (0.0) -> Camera HIGH (8)  -> Look DOWN (俯视)
      const mappedHeight = THREE.MathUtils.lerp(8, -6, targetHeight);
      
      // 2. Smoothly interpolate current height
      currentHeightRef.current = THREE.MathUtils.damp(currentHeightRef.current, mappedHeight, 2, delta);
      
      // 3. Set Position
      // Fixed Z distance of 14 to see the whole tree comfortably from different angles
      state.camera.position.set(
        0, 
        currentHeightRef.current,
        14 
      );
      
      // 4. Look at the center of the tree
      // Adjusted from 4 to 0.5 to center the tree body, not just the top
      state.camera.lookAt(0, 0.5, 0);
    } 
  });
  return null;
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [treeState, setTreeState] = useState<TreeState>(TreeState.ASSEMBLED);
  const [morphProgress, setMorphProgress] = useState(0); // 0 = Tree, 1 = Scatter
  const [handDetected, setHandDetected] = useState(false);
  const [handHeight, setHandHeight] = useState(0.5); // 0 to 1
  
  const targetMorphRef = useRef(0);
  const targetHeightRef = useRef(0.5);

  // Smooth lerp loop for UI/Logic state
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      // Linear interpolation towards target for morph
      setMorphProgress(prev => {
        const diff = targetMorphRef.current - prev;
        if (Math.abs(diff) < 0.001) return targetMorphRef.current;
        return prev + diff * 0.08;
      });
      
      // Smooth hand height for UI/Camera state
      setHandHeight(prev => {
         const diff = targetHeightRef.current - prev;
         if (Math.abs(diff) < 0.001) return targetHeightRef.current;
         return prev + diff * 0.05;
      });

      frameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleHandUpdate = useCallback((distance: number, height: number, detected: boolean) => {
    if (!hasStarted) return; // Don't process hands until started
    setHandDetected(detected);
    
    if (detected) {
      // --- 1. Morph Control (Spread) ---
      // Map hand distance (0=closed, 1=open) to Morph (0=Tree, 1=Scatter)
      const morphVal = Math.min(Math.max(distance, 0), 1);
      targetMorphRef.current = morphVal;
      
      if (morphVal > 0.6) setTreeState(TreeState.SCATTERED);
      else if (morphVal < 0.4) setTreeState(TreeState.ASSEMBLED);

      // --- 2. Camera Control (Height) ---
      targetHeightRef.current = height;

    } else {
      // Fallback to manual state if hands lost
      targetMorphRef.current = treeState === TreeState.ASSEMBLED ? 0 : 1;
      // Do not reset height immediately, let it stay or let orbit controls take over
    }
  }, [treeState, hasStarted]);

  const toggleState = () => {
    const newState = treeState === TreeState.ASSEMBLED ? TreeState.SCATTERED : TreeState.ASSEMBLED;
    setTreeState(newState);
    targetMorphRef.current = newState === TreeState.ASSEMBLED ? 0 : 1;
  };

  return (
    <div className="relative w-full h-full bg-[#010b08] text-[#D4AF37] overflow-hidden select-none font-serif">
      
      <GiftOverlay onOpen={() => setHasStarted(true)} />

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0 transition-opacity duration-1000" style={{ opacity: hasStarted ? 1 : 0 }}>
        <Canvas camera={{ position: [0, 1, 14], fov: 45 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
          <color attach="background" args={['#010b08']} />
          <fog attach="fog" args={['#010b08', 8, 35]} />
          
          <ParticleScene morphProgress={morphProgress} treeState={treeState} />
          
          <ContactShadows opacity={0.5} scale={20} blur={2} far={4} resolution={256} color="#000" />
          <Environment preset="city" />
          
          {/* Custom Camera Rig for Gesture Control */}
          <CameraRig detected={handDetected} targetHeight={handHeight} />

          <OrbitControls 
            enabled={!handDetected} // Disable mouse control when hands are active
            enableZoom={true} 
            enablePan={false} 
            maxPolarAngle={Math.PI / 1.5}
            minDistance={4}
            maxDistance={20}
            autoRotate={!handDetected && treeState === TreeState.ASSEMBLED && hasStarted}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {hasStarted && (
        <>
          <HandTracker onHandUpdate={handleHandUpdate} debug={false} />

          {/* --- UI LAYER --- */}
          
          {/* Header */}
          <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent animate-fade-in">
            <div>
              <h1 className="text-4xl md:text-5xl font-playfair italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#FFFDD0] to-[#D4AF37] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                Arix Signature
              </h1>
              <p className="text-xs md:text-sm text-[#D4AF37]/60 mt-2 uppercase tracking-[0.3em] font-sans border-t border-[#D4AF37]/30 pt-2 inline-block">
                Interactive Holiday Experience
              </p>
            </div>
          </div>

          {/* Hand Status Indicator */}
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-700 ${handDetected ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
            <div className="flex flex-col items-center justify-center text-white/20 animate-pulse">
              <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center mb-4">
                <div className="w-1 h-1 bg-white/50 rounded-full" />
              </div>
              <p className="text-[10px] tracking-[0.2em] font-sans uppercase">Raise Hands to Control</p>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="absolute bottom-0 w-full p-8 z-20 flex flex-col items-center justify-end bg-gradient-to-t from-black/90 to-transparent h-56 animate-slide-up">
            
            {/* Interaction Indicators */}
            {handDetected && (
              <div className="flex gap-8 mb-4 opacity-70">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-16 w-1 bg-white/10 rounded-full relative overflow-hidden">
                    {/* Invert visual indicator for Height to match the physical feeling: Hand UP fills bar */}
                    <div className="absolute bottom-0 w-full bg-[#D4AF37] rounded-full transition-all duration-200" style={{ height: `${handHeight * 100}%`}} />
                  </div>
                  <span className="text-[8px] tracking-widest uppercase text-[#D4AF37]">Height</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-16 w-1 bg-white/10 rounded-full relative overflow-hidden">
                    <div className="absolute bottom-0 w-full bg-[#D4AF37] rounded-full transition-all duration-200" style={{ height: `${morphProgress * 100}%`}} />
                  </div>
                  <span className="text-[8px] tracking-widest uppercase text-[#D4AF37]">Spread</span>
                </div>
              </div>
            )}

            {/* Progress Bar (Visualizing the Morph) */}
            {!handDetected && (
              <div className="w-full max-w-md h-0.5 bg-white/10 mb-8 relative rounded-full overflow-hidden">
                <div 
                    className="absolute top-0 left-0 h-full bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" 
                    style={{ width: `${(1 - morphProgress) * 100}%`, transition: 'width 0.1s linear' }}
                />
                </div>
            )}

            {/* Manual Toggle */}
            <button
              onClick={toggleState}
              className="group relative px-8 py-3 bg-[#022D36]/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-full text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#010b08] transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="relative flex items-center gap-3 font-sans text-sm tracking-widest uppercase font-semibold">
                {treeState === TreeState.ASSEMBLED ? <ScatterIcon /> : <TreeIcon />}
                <span>{treeState === TreeState.ASSEMBLED ? 'Scatter' : 'Assemble'}</span>
              </div>
            </button>
            
            <p className="text-[10px] text-[#D4AF37]/30 mt-6 font-sans tracking-widest">
              {handDetected ? 'GESTURE: HAND UP (LOOK UP) / HAND DOWN (LOOK DOWN)' : 'MANUAL MODE'}
            </p>
          </div>
        </>
      )}

    </div>
  );
};

export default App;