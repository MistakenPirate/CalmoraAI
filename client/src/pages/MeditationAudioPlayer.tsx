import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const MeditationAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef(null);

  // const meditations = [
  //   { 
  //     id: 1, 
  //     name: 'Mindful Breathing', 
  //     description: 'A gentle meditation focusing on breath awareness',
  //     src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' 
  //   },
  //   { 
  //     id: 2, 
  //     name: 'Body Scan Relaxation', 
  //     description: 'Progressive relaxation for stress relief',
  //     src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' 
  //   },
  //   { 
  //     id: 3, 
  //     name: 'Anxiety Relief', 
  //     description: 'Calming meditation for anxiety and worry',
  //     src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' 
  //   },
  //   { 
  //     id: 4, 
  //     name: 'Sleep Meditation', 
  //     description: 'Gentle guidance to help you fall asleep',
  //     src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' 
  //   },
  // ];
  const meditations = [
    {
      id: 1,
      name: 'Mindful Breathing',
      description: 'A gentle meditation focusing on breath awareness',
      src: 'https://cdn.pixabay.com/download/audio/2022/03/05/audio_27857a9448.mp3'
    },
    {
      id: 2,
      name: 'Body Scan Relaxation',
      description: 'Progressive relaxation for stress relief',
      src: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1ebd.mp3'
    },
    {
      id: 3,
      name: 'Anxiety Relief',
      description: 'Calming meditation for anxiety and worry',
      src: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_861be97c6d.mp3'
    },
    {
      id: 4,
      name: 'Sleep Meditation',
      description: 'Gentle guidance to help you fall asleep',
      src: 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_c9b7515236.mp3'
    },
  ];

  useEffect(() => {
    // Update audio source when track changes
    if (audioRef.current) {
      audioRef.current.src = meditations[currentTrackIndex].src;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentTrackIndex]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleSliderChange = (value) => {
    const audio = audioRef.current;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % meditations.length);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prevIndex) => 
      prevIndex === 0 ? meditations.length - 1 : prevIndex - 1
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentMeditation = meditations[currentTrackIndex];

  return (
    <Card className="mt-8 shadow-md">
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold text-slate-700 mb-1">Guided Meditations</h2>
        <p className="text-slate-500 mb-6">Take a moment to relax and center yourself</p>
        
        <audio
          ref={audioRef}
          src={currentMeditation.src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={nextTrack}
        />
        
        <div className="mb-6">
          <h3 className="text-xl font-medium text-slate-700">{currentMeditation.name}</h3>
          <p className="text-slate-500 text-sm">{currentMeditation.description}</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSliderChange}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-slate-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          <div className="flex justify-center items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full" 
              onClick={prevTrack}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button
              onClick={togglePlayPause}
              variant="default"
              size="icon"
              className="h-12 w-12 rounded-full bg-blue-500 hover:bg-blue-600"
            >
              {isPlaying ? 
                <Pause className="h-6 w-6 text-white" /> : 
                <Play className="h-6 w-6 text-white ml-1" />
              }
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full" 
              onClick={nextTrack}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-2">
          {meditations.map((meditation, index) => (
            <Button
              key={meditation.id}
              variant={index === currentTrackIndex ? "default" : "outline"}
              className={`text-sm justify-start px-3 py-2 h-auto ${
                index === currentTrackIndex ? "bg-blue-500 text-white" : "text-slate-700"
              }`}
              onClick={() => setCurrentTrackIndex(index)}
            >
              {meditation.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MeditationAudioPlayer;