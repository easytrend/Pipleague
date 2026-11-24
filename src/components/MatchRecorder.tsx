'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, Play, Square, Video, VideoOff } from 'lucide-react';

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      // Capture entire window/tab or trading arena
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true,
      });

      recordedChunksRef.current = [];
      const options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp9,opus' };
      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsRecording(false);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // Clean up tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // chunk every 1s
      setIsRecording(true);
      setRecordSeconds(0);
      setDownloadUrl(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);

      // Handle user clicking "Stop Sharing" on browser's native banner
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
    } catch (err) {
      console.warn('Screen recording cancelled or failed:', err);
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
          title="Record live trading match video replay"
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
