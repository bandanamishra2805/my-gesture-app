import React, { useRef, useEffect, useState } from "react";
import "./App.css";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { recognizeGesture } from "./recognizeGesture"; // import from new file
import gesturePatterns from "./gestures_pattern.json";

function App() {
  const videoRef = useRef(null);
  const [gesture, setGesture] = useState("");

  useEffect(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const gestureName = recognizeGesture(
          results.multiHandLandmarks[0],
          gesturePatterns.gestures
        );
        setGesture(gestureName);
      } else {
        setGesture("");
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480
    });
    camera.start();
  }, []);

  return (
    <div className="App">
      <h1>Hand Gesture Recognition</h1>
      <video ref={videoRef} className="video" autoPlay playsInline muted />
      <h2>Gesture: {gesture}</h2>
    </div>
  );
}

export default App;
