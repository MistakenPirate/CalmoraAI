import React, { useState, useRef, useEffect } from "react";
import MeditationAudioPlayer from "../pages/MeditationAudioPlayer";
import {
  Mic,
  StopCircle,
  Video,
  // MessageSquare,
  // Send,
  // Camera,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
import {
  base64ToFloat32Array,
  float32ToPcm16,
  systemPrompt2,
} from "@/lib/utils";
import AudioRecorder from "@/components/AudioRecorder";

interface Config {
  systemPrompt: string;
  voice: string;
  googleSearch: boolean;
  allowInterruptions: boolean;
}

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  type: "user" | "assistant";
}

interface AudioInput {
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  stream: MediaStream;
}

interface ChatMessagesProps {
  messages: Message[];
}

// Fix for AudioContext type
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`rounded-lg p-3 max-w-[80%] break-words ${
            message.type === "user" ? "bg-blue-100 ml-auto" : "bg-gray-100"
          }`}
        >
          <p className="text-slate-800">{message.text}</p>
          <span className="text-xs text-slate-500">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

const ChatInterface: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [config, setConfig] = useState<Config>({
    systemPrompt: systemPrompt2,
    voice: "Puck",
    googleSearch: true,
    allowInterruptions: false,
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  // const [currentMessage, setCurrentMessage] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInputRef = useRef<AudioInput | null>(null);
  const clientId = useRef<string>(crypto.randomUUID());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const voices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];
  const audioBuffer: Float32Array[] = [];
  let isPlaying = false;

  const addMessage = (text: string, type: "user" | "assistant" = "user") => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      type,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const startStream = async (mode: "text" | "audio" | "video") => {
    wsRef.current = new WebSocket(`ws://localhost:8000/ws/${clientId.current}`);

    wsRef.current.onopen = async () => {
      if (wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "config",
            config: config,
          })
        );

        if (mode === "audio" || mode === "video") {
          await startAudioStream();
        }
        if (mode === "video") {
          await startVideo();
        }
        setIsStreaming(true);
        setIsConnected(true);
      }
    };

    wsRef.current.onmessage = async (event: MessageEvent) => {
      const response = JSON.parse(event.data);
      if (response.type === "audio") {
        const audioData = base64ToFloat32Array(response.data);
        playAudioData(audioData);
      } else if (response.type === "text") {
        addMessage(response.text, "assistant");
      }
    };

    wsRef.current.onerror = () => {
      setError("WebSocket error occurred");
      setIsStreaming(false);
    };

    wsRef.current.onclose = () => {
      setIsStreaming(false);
      setIsConnected(false);
    };
  };

  const startAudioStream = async () => {
    try {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)({
        sampleRate: 16000,
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(
        512,
        1,
        1
      );

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = float32ToPcm16(inputData);
          const base64Data = btoa(
            String.fromCharCode(...new Uint8Array(pcmData.buffer))
          );
          wsRef.current.send(
            JSON.stringify({
              type: "audio",
              data: base64Data,
            })
          );
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      audioInputRef.current = { source, processor, stream };
    } catch (err) {
      setError(
        `Failed to access microphone: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoStreamRef.current = stream;

        videoIntervalRef.current = setInterval(() => {
          captureAndSendFrame();
        }, 1000);
      }
    } catch (err) {
      setError(
        `Failed to access camera: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const captureAndSendFrame = () => {
    if (!canvasRef.current || !videoRef.current || !wsRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);
    const base64Image = canvasRef.current.toDataURL("image/jpeg").split(",")[1];

    wsRef.current.send(
      JSON.stringify({
        type: "image",
        data: base64Image,
      })
    );
  };

  const stopStream = () => {
    if (audioInputRef.current) {
      const { source, processor, stream } = audioInputRef.current;
      source.disconnect();
      processor.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      audioInputRef.current = null;
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }

    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsStreaming(false);
    setIsConnected(false);
  };

  const playAudioData = async (audioData: Float32Array) => {
    audioBuffer.push(audioData);
    if (!isPlaying) {
      playNextInQueue();
    }
  };

  const playNextInQueue = async () => {
    if (!audioContextRef.current || audioBuffer.length === 0) {
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const audioData = audioBuffer.shift();

    if (audioData) {
      const buffer = audioContextRef.current.createBuffer(
        1,
        audioData.length,
        24000
      );
      buffer.copyToChannel(audioData, 0);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        playNextInQueue();
      };
      source.start();
    }
  };

  // const sendTextMessage = () => {
  //   if (currentMessage.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
  //     wsRef.current.send(
  //       JSON.stringify({
  //         type: "text",
  //         data: currentMessage,
  //       })
  //     );
  //     addMessage(currentMessage, "user");
  //     setCurrentMessage("");
  //   }
  // };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={config.systemPrompt}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    systemPrompt: e.target.value,
                  }))
                }
                disabled={isConnected}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select
                value={config.voice}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, voice: value }))
                }
                disabled={isConnected}
              >
                <SelectTrigger id="voice-select">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice} value={voice}>
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="google-search"
                checked={config.googleSearch}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({
                    ...prev,
                    googleSearch: checked as boolean,
                  }))
                }
                disabled={isConnected}
              />
              <Label htmlFor="google-search">Enable Google Search</Label>
            </div>
          </CardContent>
        </Card> */}
        <h1 className="text-center text-4xl p-10 text-slate-400">
          Calmora: Your AI Therapist
        </h1>
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="audio" className="h-[400px]">
              <TabsList className="mb-4">
                <TabsTrigger value="audio" className="flex gap-2">
                  <Phone className="h-4 w-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="video" className="flex gap-2">
                  <Video className="h-4 w-4" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="meditation" className="flex gap-2">
                  🎧 Meditation
                </TabsTrigger>
                <TabsTrigger value="sentiment" className="flex gap-2">
                  Sentiment
                </TabsTrigger>
              </TabsList>

              <TabsContent value="audio" className="h-full">
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-hidden">
                    <ChatMessages messages={messages} />
                  </div>
                  <div className="flex justify-center mt-4">
                    <Button
                      size="lg"
                      variant={isStreaming ? "destructive" : "default"}
                      className="rounded-full p-8"
                      onClick={() =>
                        isStreaming ? stopStream() : startStream("audio")
                      }
                    >
                      {isStreaming ? (
                        <StopCircle className="h-8 w-8" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="video" className="h-full">
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatMessages messages={messages} />
                  </div>
                  <Button
                    className="w-full"
                    variant={isStreaming ? "destructive" : "default"}
                    onClick={() =>
                      isStreaming ? stopStream() : startStream("video")
                    }
                  >
                    {isStreaming ? (
                      <StopCircle className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="meditation">
                <MeditationAudioPlayer />
              </TabsContent>
              <TabsContent value="sentiment" className="h-full">
                <AudioRecorder/>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatInterface;
