'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, Mic, Square, Video } from 'lucide-react';

interface MatchRecorderProps {
  matchTitle?: string;
  autoStopOnMatchEnd?: boolean;
  isMatchEnded?: boolean;
}

export default function MatchRecorder({
  matchTitle = 'PipLeague-Duel',
  autoStopOnMatchEnd = true,
  isMatchEnded = false,
}: MatchRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [hasMic, setHasMic] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);

  // Stop recording automatically when match ends
  useEffect(() => {
    if (autoStopOnMatchEnd && isMatchEnded && isRecording) {
      stopRecording();
    }
  }, [isMatchEnded, autoStopOnMatchEnd, isRecording]);

  const startRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      alert('Screen/Video recording is not supported in this browser.');
      return;
    }

    try {
      // 1. Capture user's microphone audio explicitly
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        setHasMic(true);
      } catch (micErr) {
        console.warn('Microphone permission not granted for recording, proceeding with screen only:', micErr);
        setHasMic(false);
      }

      // 2. Capture screen/tab video (and tab audio if available)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true,
      });

      activeStreamsRef.current = [];
      if (micStream) activeStreamsRef.current.push(micStream);
      activeStreamsRef.current.push(displayStream);

      // 3. Mix microphone voice + tab audio together using Web Audio API
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const audioDest = audioCtx.createMediaStreamDestination();

      if (micStream && micStream.getAudioTracks().length > 0) {
        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(audioDest);
      }

      if (displayStream.getAudioTracks().length > 0) {
        const displayAudioSource = audioCtx.createMediaStreamSource(displayStream);
        displayAudioSource.connect(audioDest);
      }

      // 4. Combine display video track with mixed audio track
      const combinedStream = new MediaStream();
      displayStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));

      const mixedAudioTracks = audioDest.stream.getAudioTracks();
      if (mixedAudioTracks.length > 0) {
        combinedStream.addTrack(mixedAudioTracks[0]);
      } else if (micStream && micStream.getAudioTracks().length > 0) {
        combinedStream.addTrack(micStream.getAudioTracks()[0]);
      }

      // 5. Initialize MediaRecorder
      recordedChunksRef.current = [];
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = selectedMime
        ? new MediaRecorder(combinedStream, { mimeType: selectedMime })
        : new MediaRecorder(combinedStream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsRecording(false);

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // Clean up tracks
        activeStreamsRef.current.forEach((str) => {
          str.getTracks().forEach((track) => track.stop());
        });
        activeStreamsRef.current = [];

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordSeconds(0);
      setDownloadUrl(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);

      // Handle user stopping stream from native browser banner
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
    } catch (err) {
      console.warn('Recording cancelled or encountered error:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-xs font-mono font-bold text-rose-300 hover:border-rose-400 hover:bg-rose-900/50 hover:text-white transition shadow-sm"
          title="Record live trading match video with webcam and voice"
        >
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <Video className="h-3.5 w-3.5" />
          <span>REC MATCH</span>
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 rounded-lg border border-rose-500 bg-rose-600 px-3 py-1.5 text-xs font-mono font-bold text-white transition shadow-md shadow-rose-950/50 animate-pulse"
        >
          <Square className="h-3 w-3 fill-current" />
          <span>REC {formatTime(recordSeconds)}</span>
          {hasMic && <Mic className="h-3 w-3 text-emerald-200" />}
        </button>
      )}

      {/* Download Video Replay Button */}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={`${matchTitle.toLowerCase().replace(/\s+/g, '-')}-replay.webm`}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-900/50 hover:text-white transition shadow-md shadow-emerald-950/30"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download Replay</span>
        </a>
      )}
    </div>
  );
}
