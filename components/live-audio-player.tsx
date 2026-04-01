"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, VolumeX, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveAudioPlayerProps {
  callId: string;
  isActive: boolean;
}

export function LiveAudioPlayer({ callId, isActive }: LiveAudioPlayerProps) {
  const [state, setState] = useState<"idle" | "connecting" | "live" | "error" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const bufferQueueRef = useRef<Float32Array[]>([]);
  const drainScheduledRef = useRef(false);

  const inboundRateRef = useRef(0);
  const calibratingRef = useRef(true);
  const calibrationSamplesRef = useRef(0);
  const calibrationStartRef = useRef(0);

  const KNOWN_RATES = [8000, 16000, 24000, 32000, 44100, 48000];
  function snapToKnownRate(measured: number): number {
    let best = 48000;
    let bestDist = Infinity;
    for (const r of KNOWN_RATES) {
      const d = Math.abs(r - measured);
      if (d < bestDist) { bestDist = d; best = r; }
    }
    return best;
  }

  const drainQueue = useCallback(() => {
    drainScheduledRef.current = false;
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    const rate = inboundRateRef.current;
    if (!ctx || !gain || ctx.state === "closed" || rate === 0) return;

    while (bufferQueueRef.current.length > 0) {
      const samples = bufferQueueRef.current.shift()!;
      const buffer = ctx.createBuffer(1, samples.length, rate);
      buffer.getChannelData(0).set(samples);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);

      const now = ctx.currentTime;
      const startTime = Math.max(nextPlayTimeRef.current, now);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;
    }
  }, []);

  const scheduleDrain = useCallback(() => {
    if (!drainScheduledRef.current) {
      drainScheduledRef.current = true;
      requestAnimationFrame(drainQueue);
    }
  }, [drainQueue]);

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    setState("connecting");

    try {
      const res = await fetch(`/api/calls/${callId}/listen`);
      if (!res.ok) {
        const data = await res.json();
        setState(data.error?.includes("no longer") ? "ended" : "error");
        return;
      }

      const { listenUrl } = await res.json();
      if (!listenUrl) {
        setState("error");
        return;
      }

      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : 1;
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainRef.current = gain;
      nextPlayTimeRef.current = 0;
      calibratingRef.current = true;
      calibrationSamplesRef.current = 0;
      calibrationStartRef.current = 0;
      inboundRateRef.current = 0;

      const ws = new WebSocket(listenUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => setState("live");

      ws.onmessage = (event) => {
        if (!(event.data instanceof ArrayBuffer)) return;

        const pcm16 = new Int16Array(event.data);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
        }

        if (calibratingRef.current) {
          if (calibrationStartRef.current === 0) {
            calibrationStartRef.current = performance.now();
          }
          calibrationSamplesRef.current += pcm16.length;
          bufferQueueRef.current.push(float32);

          const elapsed = performance.now() - calibrationStartRef.current;
          // After 600ms of wall-clock data, derive sample rate
          if (elapsed >= 600) {
            const measuredRate = (calibrationSamplesRef.current / elapsed) * 1000;
            inboundRateRef.current = snapToKnownRate(measuredRate);
            calibratingRef.current = false;
            console.log(`[LiveAudio] calibrated: ${Math.round(measuredRate)} Hz → snapped to ${inboundRateRef.current} Hz (${calibrationSamplesRef.current} samples in ${Math.round(elapsed)}ms)`);
            scheduleDrain();
          }
          return;
        }

        bufferQueueRef.current.push(float32);
        scheduleDrain();
      };

      ws.onerror = () => setState("error");
      ws.onclose = () => {
        setState("ended");
        wsRef.current = null;
      };
    } catch {
      setState("error");
    }
  }, [callId, muted, scheduleDrain]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    gainRef.current = null;
    bufferQueueRef.current = [];
    setState("idle");
  }, []);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = muted ? 0 : 1;
    }
  }, [muted]);

  useEffect(() => {
    if (!isActive && wsRef.current) {
      disconnect();
    }
  }, [isActive, disconnect]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      audioCtxRef.current?.close();
    };
  }, []);

  if (!isActive && state === "idle") return null;

  return (
    <div className="flex items-center gap-2">
      {state === "idle" && (
        <button
          onClick={connect}
          className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 transition-all hover:bg-orange-100 hover:shadow-sm"
        >
          <Radio className="h-3 w-3" />
          Listen in
        </button>
      )}

      {state === "connecting" && (
        <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
          Connecting...
        </div>
      )}

      {state === "live" && (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live
            {/* Audio bars */}
            <div className="ml-1 flex items-end gap-[2px]">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full bg-green-500 transition-all",
                    muted ? "h-1" : "animate-bounce"
                  )}
                  style={{
                    height: muted ? 4 : undefined,
                    animationDelay: `${i * 100}ms`,
                    animationDuration: "600ms",
                    maxHeight: 12,
                    minHeight: 3,
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => setMuted(!muted)}
            className="flex h-6 w-6 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </button>

          <button
            onClick={disconnect}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Stop
          </button>
        </div>
      )}

      {state === "ended" && (
        <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          Stream ended
        </div>
      )}

      {state === "error" && (
        <button
          onClick={() => { setState("idle"); }}
          className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
