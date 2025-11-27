import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

interface HandTrackerProps {
  onHandUpdate: (distance: number, height: number, detected: boolean) => void;
  debug?: boolean;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate, debug = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        setLoading(false);
        startWebcam();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    initHandLandmarker();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWebcam = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && videoRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    }
  };

  const predictWebcam = () => {
    if (!videoRef.current || !handLandmarkerRef.current) return;
    
    // Process frames
    const startTimeMs = performance.now();
    if (videoRef.current.currentTime > 0) {
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
      // Calculate Interaction
      let distance = 0;
      let height = 0.5; // Default middle
      let detected = false;

      if (results.landmarks && results.landmarks.length > 0) {
        detected = true;
        
        // --- 2 HANDS LOGIC ---
        if (results.landmarks.length === 2) {
          const handA = results.landmarks[0][8]; // Index tip
          const handB = results.landmarks[1][8]; // Index tip
          
          // 1. Distance (Spread)
          const dx = handA.x - handB.x;
          const dy = handA.y - handB.y;
          distance = Math.sqrt(dx * dx + dy * dy); 
          
          // 2. Height (Average Y)
          // Note: MediaPipe Y is 0 (top) to 1 (bottom).
          // We invert it so 1 is "High Hands" (Top of screen) and 0 is "Low Hands".
          const avgY = (handA.y + handB.y) / 2;
          height = 1.0 - avgY; 
        } 
        // --- 1 HAND LOGIC ---
        else if (results.landmarks.length === 1) {
          const hand = results.landmarks[0];
          const thumb = hand[4];
          const pinky = hand[20];
          const index = hand[8];

          // 1. Distance (Open/Close Palm)
          const dx = thumb.x - pinky.x;
          const dy = thumb.y - pinky.y;
          distance = Math.sqrt(dx * dx + dy * dy) * 2.0; 

          // 2. Height (Index finger Y)
          height = 1.0 - index.y;
        }
      }

      // Clamp values
      distance = Math.min(Math.max(distance, 0), 1.2);
      height = Math.min(Math.max(height, 0), 1);

      onHandUpdate(distance, height, detected);

      // Debug drawing
      if (debug && canvasRef.current) {
        const canvasCtx = canvasRef.current.getContext("2d");
        if (canvasCtx) {
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          const drawingUtils = new DrawingUtils(canvasCtx);
          for (const landmarks of results.landmarks) {
             drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
             drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1, radius: 3 });
          }
        }
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className={`fixed bottom-4 left-4 z-50 rounded-lg overflow-hidden border border-white/20 transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative w-32 h-24 bg-black/50">
        <video 
          ref={videoRef} 
          className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]" 
          playsInline 
          muted 
          autoPlay
        />
        {debug && (
           <canvas 
             ref={canvasRef}
             className="absolute top-0 left-0 w-full h-full transform scale-x-[-1]"
             width={640}
             height={480}
           />
        )}
        <div className="absolute bottom-1 right-1 px-1 bg-black/60 text-[8px] text-white rounded">
          {loading ? "Loading Model..." : "Hand Tracking"}
        </div>
      </div>
    </div>
  );
};

export default HandTracker;