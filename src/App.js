import React, { useRef, useEffect, useState } from "react";
import "./App.css";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { recognizeGesture } from "./recognizeGesture"; // import from new file
import gesturePatterns from "./gestures_pattern.json";
import { generateSentenceFromWords } from "./gemini";
import gestureWordMap from "./GESTURE_word.json";

function App() {
  const videoRef = useRef(null);
  const [gesture, setGesture] = useState("");
  const [bufferedWords, setBufferedWords] = useState([]);
  const [sentence, setSentence] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pauseMs = 1200; // consider a pause as end of phrase
  const lastGestureTimeRef = useRef(Date.now());
  const pauseTimerRef = useRef(null);

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

        if (gestureName) {
          lastGestureTimeRef.current = Date.now();
          const wordObj = gestureWordMap[gestureName];
          const word = wordObj?.asl || gestureName.toLowerCase();
          setBufferedWords((prev) => {
            if (!word) return prev;
            // Avoid consecutive duplicates
            if (prev[prev.length - 1] === word) return prev;
            return [...prev, word];
          });
        }
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

  // Detect pause to finalize phrase and generate sentence
  useEffect(() => {
    if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    pauseTimerRef.current = setInterval(async () => {
      const now = Date.now();
      if (now - lastGestureTimeRef.current > pauseMs && bufferedWords.length > 0 && !loading) {
        setLoading(true);
        setError("");
        try {
          const text = await generateSentenceFromWords(bufferedWords);
          setSentence(text);
          setBufferedWords([]);
        } catch (e) {
          setError(e?.message || "Failed to generate sentence.");
        } finally {
          setLoading(false);
        }
      }
    }, 200);
    return () => clearInterval(pauseTimerRef.current);
  }, [bufferedWords, loading]);

  // Removed legacy manual prompt generator

  return (
    <div className="App">
      <h1>Hand Gesture Recognition</h1>
      <video ref={videoRef} className="video" autoPlay playsInline muted />
      <h2>Gesture: {gesture}</h2>

      <div style={{ marginTop: 24 }}>
        <h3>Auto sentence from gestures</h3>
        <div>
          <strong>Words:</strong> {bufferedWords.join(" ") || "(show a few signs)"}
        </div>
        {loading && <div style={{ marginTop: 8 }}>Generating sentence…</div>}
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        {sentence && (
          <div style={{ marginTop: 12 }}>
            <strong>Result:</strong> {sentence}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
