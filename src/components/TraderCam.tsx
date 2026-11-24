'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Mic, MicOff, Radio, Sparkles, Volume2, Zap } from 'lucide-react';

interface TraderCamProps {
  traderName: string;
  corner: 'A' | 'B';
  isLocalUser?: boolean;
  isAiBot?: boolean;
  compact?: boolean;
  avatarSeed?: string;
}

export default function TraderCam({
  traderName,
  corner,
  isLocalUser = false,
  isAiBot = false,
  compact = false,
  avatarSeed,
}: TraderCamProps) {
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isA = corner === 'A';
  const themeColor = isA ? 'emerald' : 'cyan';

  // Standalone camera & mic capture for local user
  useEffect(() => {
    if (!isLocalUser || isAiBot) return;

    let localStream: MediaStream | null = null;

    const syncMedia = async () => {
      if (!cameraOn && !micOn) {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          setMediaStream(null);
        }
        return;
      }

      try {
        if (!mediaStream) {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: cameraOn ? { width: 640, height: 480 } : false,
            audio: micOn,
          });
          setMediaStream(localStream);
        } else {
          // Toggle existing tracks
          mediaStream.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
          mediaStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
        }
      } catch (err) {
        console.warn('Microphone/Camera permission denied or not available:', err);
        setCameraOn(false);
      }
    };

    syncMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraOn, micOn, isLocalUser, isAiBot]);

  // Bind video element
  useEffect(() => {
    if (videoRef.current) {
      if (mediaStream && cameraOn) {
        videoRef.current.srcObject = mediaStream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [mediaStream, cameraOn]);

  // Audio level analyzer (speech visualizer)
  useEffect(() => {
    if (!mediaStream || !micOn) {
      setAudioLevel(0);
      return;
    }

    try {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(level);
        }
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
      };
    } catch {
      setAudioLevel(0);
    }
  }, [mediaStream, micOn]);

  // Bot simulation reactions and speaking rhythm
  useEffect(() => {
    if (!isAiBot) return;

    // Simulate periodic speech & banter for opponent
    const interval = setInterval(() => {
      const isTalking = Math.random() > 0.65;
      setAudioLevel(isTalking ? Math.floor(Math.random() * 60 + 20) : 0);

      // Random trade reaction emote
      if (Math.random() > 0.8) {
        const emotes = ['🔥 Breaking out!', '📈 Long order filled', '⚡ Scalping high', '👀 Watching spread'];
        const chosen = emotes[Math.floor(Math.random() * emotes.length)];
        setReaction(chosen);
        setTimeout(() => setReaction(null), 3000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isAiBot]);

  const toggleCam = () => setCameraOn((prev) => !prev);
  const toggleMic = () => setMicOn((prev) => !prev);

  const triggerReaction = (text: string) => {
    setReaction(text);
    setTimeout(() => setReaction(null), 2500);
  };

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border bg-arena-950 transition-all duration-200 ${
        isA
          ? 'border-emerald-500/30 shadow-lg shadow-emerald-950/20'
          : 'border-cyan-500/30 shadow-lg shadow-cyan-950/20'
      } ${compact ? 'h-32 sm:h-36' : 'h-44 sm:h-48'}`}
    >
      {/* Background Video or Animated Avatar Feed */}
      {cameraOn && mediaStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
        />
      ) : (
        /* Standalone Streamer Avatar with Equalizer */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-arena-900 to-arena-950/95 p-3">
          <div className="relative flex items-center justify-center">
            {/* Speaking Pulsing Aura */}
            {audioLevel > 15 && (
              <div
                className={`absolute rounded-full animate-ping opacity-60 ${
                  isA ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
                style={{
                  width: `${64 + audioLevel * 0.8}px`,
                  height: `${64 + audioLevel * 0.8}px`,
                }}
              />
            )}

            {/* Avatar Pill */}
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl font-black shadow-xl transition-transform ${
                isA
                  ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                  : 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
              } ${audioLevel > 15 ? 'scale-105' : ''}`}
            >
              {avatarSeed || (isA ? '👨‍💻' : '⚡')}
            </div>
          </div>

          <span className="mt-2 font-mono text-[10px] text-arena-400">
            {isAiBot ? 'Live Video Avatar &bull; Active' : cameraOn ? 'Connecting Cam...' : 'Camera Off (Voice Ready)'}
          </span>
        </div>
      )}

      {/* Floating Reaction Emote Bubble */}
      {reaction && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 animate-bounce rounded-full border border-amber-500/50 bg-arena-900/95 px-3 py-1 font-mono text-xs font-bold text-amber-300 shadow-xl backdrop-blur-md">
          {reaction}
        </div>
      )}

      {/* Top Header Overlay: Identity & On-Air Badge */}
      <div className="relative z-20 flex items-center justify-between p-2.5">
        <div className="flex items-center gap-1.5 rounded-lg border border-arena-800 bg-arena-950/85 px-2.5 py-1 text-xs backdrop-blur-md">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded font-mono text-[10px] font-black ${
              isA ? 'bg-emerald-400 text-arena-950' : 'bg-cyan-400 text-arena-950'
            }`}
          >
            {corner}
          </span>
          <span className="font-bold text-white max-w-[120px] truncate">{traderName}</span>
          {isLocalUser && (
            <span className="rounded bg-arena-800 px-1 text-[9px] font-mono text-arena-300">
              YOU
            </span>
          )}
        </div>

        {/* Live Audio / Video Status Badges */}
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          {audioLevel > 15 && (
            <span
              className={`flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold animate-pulse ${
                isA
                  ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                  : 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
              TALKING
            </span>
          )}

          <span className="flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 font-bold text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Bottom Controls (Only for local human trader) */}
      {isLocalUser ? (
        <div className="relative z-20 flex items-center justify-between border-t border-arena-800/80 bg-arena-950/90 p-2 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleCam}
              type="button"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-mono font-bold transition ${
                cameraOn
                  ? 'bg-emerald-500 text-arena-950 shadow-md shadow-emerald-500/25'
                  : 'bg-arena-850 text-arena-400 hover:bg-arena-800 hover:text-white'
              }`}
              title={cameraOn ? 'Turn off webcam' : 'Turn on webcam'}
            >
              {cameraOn ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
              <span className="text-[10px] hidden sm:inline">{cameraOn ? 'Cam On' : 'Cam Off'}</span>
            </button>

            <button
              onClick={toggleMic}
              type="button"
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-mono font-bold transition ${
                micOn
                  ? 'bg-cyan-500 text-arena-950 shadow-md shadow-cyan-500/25'
                  : 'bg-arena-850 text-arena-400 hover:bg-arena-800 hover:text-white'
              }`}
              title={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micOn ? <Mic className="h-3.5 w-3.5 animate-pulse" /> : <MicOff className="h-3.5 w-3.5" />}
              <span className="text-[10px] hidden sm:inline">{micOn ? 'Mic On' : 'Muted'}</span>
            </button>
          </div>

          {/* Quick Trade Emote Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => triggerReaction('🔥 Bullish!')}
              className="rounded bg-arena-850 px-1.5 py-0.5 text-xs hover:bg-arena-800"
              title="Send Bullish reaction"
            >
              🔥
            </button>
            <button
              onClick={() => triggerReaction('📉 Bearish!')}
              className="rounded bg-arena-850 px-1.5 py-0.5 text-xs hover:bg-arena-800"
              title="Send Bearish reaction"
            >
              📉
            </button>
            <button
              onClick={() => triggerReaction('💰 Profit!')}
              className="rounded bg-arena-850 px-1.5 py-0.5 text-xs hover:bg-arena-800"
              title="Send Profit reaction"
            >
              💰
            </button>
          </div>

          {/* Audio Equalizer Bars */}
          <div className="flex items-center gap-0.5 pr-1">
            {[15, 35, 70, 40].map((h, i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full transition-all duration-75 ${
                  micOn && audioLevel > 10 ? 'bg-cyan-400' : 'bg-arena-800'
                }`}
                style={{
                  height: micOn && audioLevel > 10 ? `${Math.max(4, (audioLevel / 100) * (h / 3))}px` : '4px',
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Opponent audio level meter */
        <div className="relative z-20 flex items-center justify-between border-t border-arena-800/80 bg-arena-950/80 px-3 py-1.5 text-[10px] font-mono text-arena-400">
          <span>Ringside Corner {corner}</span>
          <div className="flex items-center gap-1">
            <span className="text-arena-500">Audio:</span>
            <div className="flex items-center gap-0.5">
              {[20, 50, 80, 40].map((h, i) => (
                <div
                  key={i}
                  className={`w-0.5 rounded-full transition-all duration-75 ${
                    audioLevel > 10 ? (isA ? 'bg-emerald-400' : 'bg-cyan-400') : 'bg-arena-800'
                  }`}
                  style={{
                    height: audioLevel > 10 ? `${Math.max(4, (audioLevel / 100) * (h / 3))}px` : '4px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
