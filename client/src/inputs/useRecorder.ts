import { useCallback, useEffect, useRef, useState } from 'react';

export interface RecorderState {
  isRecording: boolean;
  recordingUrl: string | null;
  error: string | null;
}

const CANDIDATE_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Records the engine's live output — via a MediaStream tap on the master
 * bus (see AudioEngine.getRecordingStream) — into a downloadable blob.
 * Nothing is ever uploaded; this is purely local capture + browser download.
 */
export function useRecorder(getStream: () => MediaStream | null) {
  const [state, setState] = useState<RecorderState>({ isRecording: false, recordingUrl: null, error: null });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const start = useCallback(() => {
    const stream = getStream();
    if (!stream) {
      setState((s) => ({ ...s, error: 'Start the audio engine before recording.' }));
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setState((s) => ({ ...s, error: 'Recording is not supported in this browser.' }));
      return;
    }

    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setState({ isRecording: false, recordingUrl: url, error: null });
    };

    recorder.start();
    recorderRef.current = recorder;
    setState({ isRecording: true, recordingUrl: null, error: null });
  }, [getStream]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, []);

  return { ...state, start, stop };
}
