'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpotlightVideoProps {
  src: string;
  isMuted: boolean;
  onMuteChange: (muted: boolean) => void;
  onEnded?: () => void;
  onProgress?: (pct: number) => void;
}

export function SpotlightVideo({
  src,
  isMuted,
  onMuteChange,
  onEnded,
  onProgress,
}: SpotlightVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Refs to avoid stale closures in IntersectionObserver
  const isMutedRef = useRef(isMuted);
  const onMuteChangeRef = useRef(onMuteChange);
  const onEndedRef = useRef(onEnded);

  const [isPlaying, setIsPlaying] = useState(false);
  const [flashIcon, setFlashIcon] = useState<'play' | 'pause' | null>(null);

  // Keep refs current
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { onMuteChangeRef.current = onMuteChange; }, [onMuteChange]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  // Sync isMuted prop → video element (handles parent-driven mute changes)
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = isMuted;
  }, [isMuted]);

  // IntersectionObserver: play with audio when scrolled in, pause when scrolled away
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !video.ended) {
          video.muted = isMutedRef.current;
          video.play().catch(() => {
            // Browser blocked unmuted autoplay — fall back to muted
            video.muted = true;
            isMutedRef.current = true;
            onMuteChangeRef.current(true);
            video.play().catch(() => {});
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []); // Runs fresh on each mount (component re-mounts per slide change)

  const handleClick = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      triggerFlash('play');
    } else {
      video.pause();
      triggerFlash('pause');
    }
  };

  const triggerFlash = (icon: 'play' | 'pause') => {
    setFlashIcon(icon);
    setTimeout(() => setFlashIcon(null), 700);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    onMuteChange(next);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    onProgress?.((video.currentTime / video.duration) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  const showCenterIcon = !isPlaying || flashIcon !== null;
  const centerIcon = flashIcon ?? (!isPlaying ? 'play' : null);

  return (
    <div
      ref={containerRef}
      className='relative h-full w-full cursor-pointer select-none'
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        className='absolute inset-0 h-full w-full object-cover'
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleEnded}
      />

      {/* Bottom gradient */}
      <div className='absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent pointer-events-none' />

      {/* Center play/pause flash icon */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300',
          showCenterIcon ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className='bg-black/50 backdrop-blur-sm rounded-full p-4'>
          {centerIcon === 'pause' ? (
            <Pause className='h-7 w-7 text-white fill-white' />
          ) : (
            <Play className='h-7 w-7 text-white fill-white' />
          )}
        </div>
      </div>

      {/* Mute / unmute — bottom right */}
      <div className='absolute bottom-4 right-4 flex flex-col items-end gap-1.5 z-10'>
        {isMuted && (
          <div className='flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 px-2.5 py-1 pointer-events-none animate-pulse'>
            <Volume2 className='h-3 w-3 text-white/80' />
            <span className='text-[10px] font-medium text-white/80 leading-none whitespace-nowrap'>Tap for audio</span>
          </div>
        )}
        <button
          onClick={toggleMute}
          className='flex items-center justify-center h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-all active:scale-90'
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className='h-4 w-4' /> : <Volume2 className='h-4 w-4' />}
        </button>
      </div>
    </div>
  );
}
