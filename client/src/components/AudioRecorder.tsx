import React, { useState } from "react";
import { ReactMic } from "react-mic";
import axios from "axios";

const AudioRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Start Recording
  const startRecording = () => {
    setRecording(true);
    setResponse(null);
  };

  // Stop Recording
  const stopRecording = () => {
    setRecording(false);
  };

  // When audio stops, save it
  const onStop = (recordedBlob) => {
    console.log("Recorded Blob:", recordedBlob);
    setBlob(recordedBlob.blob);
  };

  // Convert blob to proper WAV format using Web Audio API
  const convertToWav = async (blob) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        try {
          // Decode the audio data
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Create a proper WAV file
          const wavBlob = createWavFile(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = (error) => reject(error);
      fileReader.readAsArrayBuffer(blob);
    });
  };
  
  // Create WAV file from audio buffer
  const createWavFile = (audioBuffer) => {
    const numOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChannels * 2;
    const sampleRate = audioBuffer.sampleRate;
    
    // Create buffer for WAV file
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    
    // Write WAV header
    // "RIFF" chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChannels * 2, true); // byte rate
    view.setUint16(32, numOfChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);
    
    // Write audio data
    const dataIndex = 44;
    const channels = [];
    
    // Extract channels
    for (let i = 0; i < numOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    
    // Interleave channels and convert to 16-bit PCM
    let offset = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        // Convert float to int16
        view.setInt16(dataIndex + offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };
  
  // Helper function to write strings to DataView
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Upload audio file to FastAPI backend
  const sendAudio = async () => {
    if (!blob) {
      alert("Please record audio first!");
      return;
    }

    setIsLoading(true);
    
    try {
      // Convert to proper WAV format
      const wavBlob = await convertToWav(blob);
      
      const formData = new FormData();
      formData.append("file", wavBlob, "audio.wav");

      const res = await axios.post(
        "http://localhost:8000/analyze_sentiment",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setResponse(res.data);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to analyze sentiment: " + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>🎙 Speech Sentiment Analysis</h2>

      {/* Audio Recorder */}
      <div className="flex justify-center">

      <ReactMic
        record={recording}
        onStop={onStop}
        mimeType="audio/wav"
        className="sound-wave"
        strokeColor="#000000"
        backgroundColor="#FF4081"
        visualSetting="sinewave"
        width="100%"
        height="100"
      />
      </div>

      {/* Buttons */}
      <div style={{ marginTop: "20px" }}>
        <button 
          onClick={startRecording} 
          disabled={recording}
          style={{
            padding: "10px 15px",
            margin: "0 5px",
            backgroundColor: recording ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: recording ? "default" : "pointer"
          }}
        >
          Start Recording
        </button>
        <button 
          onClick={stopRecording} 
          disabled={!recording}
          style={{
            padding: "10px 15px",
            margin: "0 5px",
            backgroundColor: !recording ? "#ccc" : "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !recording ? "default" : "pointer"
          }}
        >
          Stop Recording
        </button>
        <button 
          onClick={sendAudio} 
          disabled={!blob || isLoading}
          style={{
            padding: "10px 15px",
            margin: "0 5px",
            backgroundColor: !blob || isLoading ? "#ccc" : "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !blob || isLoading ? "default" : "pointer"
          }}
        >
          {isLoading ? "Analyzing..." : "Analyze Sentiment"}
        </button>
      </div>

      {/* Response */}
      {response && (
        <div style={{ 
          marginTop: "30px", 
          textAlign: "left", 
          padding: "20px", 
          backgroundColor: "#f5f5f5", 
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h3>Transcribed Text:</h3>
          <p style={{ fontSize: "18px" }}>{response.transcription}</p>

          <h3>Sentiment Analysis:</h3>
          <div style={{ 
            display: "flex", 
            alignItems: "center",
            backgroundColor: 
              response.sentiment === "Positive" ? "#e6f7e6" : 
              response.sentiment === "Negative" ? "#fde6e6" : "#f0f0f0",
            padding: "10px",
            borderRadius: "4px"
          }}>
            <span style={{ 
              fontSize: "32px", 
              marginRight: "15px" 
            }}>
              {response.sentiment === "Positive" ? "😊" : 
               response.sentiment === "Negative" ? "😔" : "😐"}
            </span>
            <div>
              <p style={{ margin: "5px 0", fontSize: "18px", fontWeight: "bold" }}>
                {response.sentiment}
              </p>
              <p style={{ margin: "5px 0" }}>
                Polarity Score: {response.polarity.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;