'use client';

import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Key, ShieldCheck, X, Zap } from 'lucide-react';

interface DerivModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DerivModal({ isOpen, onClose }: DerivModalProps) {
  const [token, setToken] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('pipleague_deriv_token', token);
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-arena-700 bg-arena-950 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-arena-400 hover:bg-arena-850 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-arena-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-bold shadow-md shadow-rose-900/40">
            D
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Deriv Integration Center
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                ACTIVE FEED
              </span>
            </h3>
            <p className="text-xs text-arena-400">
              Institutional tick streaming & virtual account connectivity
            </p>
          </div>
        </div>

        {/* Status Body */}
        <div className="py-4 space-y-4 text-xs font-mono">
          <div className="rounded-xl bg-arena-900 p-3.5 border border-arena-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-arena-300 font-semibold flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-400" />
                Live Market Data Feed
              </span>
              <span className="text-emerald-400 font-bold">CONNECTED</span>
            </div>
            <p className="text-arena-400 text-[11px] leading-relaxed">
              PipLeague is currently connected to Deriv&apos;s public WebSocket engine (<code className="text-arena-300">wss://api.derivws.com</code>). All EUR/USD, GBP/USD, USD/JPY, Gold (XAU), and Volatility 100 ticks are streaming live in real-time.
            </p>
          </div>

          <div className="rounded-xl bg-arena-900 p-3.5 border border-arena-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-arena-300 font-semibold flex items-center gap-1.5">
                <Key className="h-4 w-4 text-amber-400" />
                Optional: Link Deriv Demo Account (API Token)
              </span>
            </div>
            <p className="text-arena-400 text-[11px] leading-relaxed">
              If you have a Deriv account, you can paste your Demo Read/Trade API token below to mirror your Deriv virtual bankroll.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] text-arena-400 uppercase tracking-wider">
                Deriv Demo API Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from app.deriv.com/account/api-token"
                className="w-full rounded-lg border border-arena-700 bg-arena-850 px-3 py-2 text-xs text-white placeholder-arena-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <a
                href="https://app.deriv.com/account/api-token"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Get API token on Deriv</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-arena-950 hover:bg-emerald-400 transition"
              >
                {isSaved ? <Check className="h-3.5 w-3.5" /> : null}
                <span>{isSaved ? 'Saved!' : 'Save Token'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-[10px] font-mono text-arena-500">
          Paper funds only. No deposit required. Powered by Deriv WebSockets.
        </div>
      </div>
    </div>
  );
}
