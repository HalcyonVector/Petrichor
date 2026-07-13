import { useEffect } from 'react';

export interface MediaSessionInfo {
  title: string;
  artist: string;
}

/**
 * Publishes now-playing info to the OS media hub (lock screen, notification
 * shade, Control Center, Chrome's media widget) and wires its play/pause
 * controls back to the app, so a session can be controlled even once the
 * screen locks or the tab is backgrounded, not just from inside the page.
 * A no-op on browsers without the Media Session API.
 */
export function useMediaSession(started: boolean, info: MediaSessionInfo, onPlay: () => void, onPause: () => void) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: info.title,
      artist: info.artist,
      artwork: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }, [info.title, info.artist]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;
    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    };
  }, [onPlay, onPause]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = started ? 'playing' : 'paused';
  }, [started]);
}
