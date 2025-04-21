import type Stream from "stream";
import React, { useState, useEffect } from "react";
import { render, Text } from "ink";
import mic from "mic-ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranscriptionClient } from "./hooks/useTranscriptionClient.js";

const queryClient = new QueryClient();

const App = ({ debug, clear }: { debug: boolean; clear: () => void }) => {
  const {
    transcriptionClient,
    isLoading: isLoadingTranscriptionClient,
    error: transcriptionClientError,
  } = useTranscriptionClient({
    apiKey: process.env.OPENAI_API_KEY ?? "",
    debug,
    session: {
      input_audio_format: "pcm16",
      input_audio_noise_reduction: { type: "near_field" },
      input_audio_transcription: {
        language: "en",
        model: "gpt-4o-mini-transcribe",
        prompt: "expect words related to technology",
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
    },
  });
  const [transcription] = useState("");
  const [micError, setMicError] = useState("");

  useEffect(() => {
    if (transcriptionClient) {
      const micInstance = mic({
        rate: "16000",
        channels: "1",
        debug: false,
        exitOnSilence: 6,
        fileType: "raw",
        encoding: "signed-integer",
      });

      const micInputStream: Stream.PassThrough = micInstance.getAudioStream();

      micInputStream.on("data", (data: Buffer) => {
        transcriptionClient.appendInputAudio(data);
      });

      micInputStream.on("error", (error: Error) => {
        setMicError(`Microphone error: ${error.message}`);
      });

      micInstance.start();

      transcriptionClient.onAllServerEvents((event) => {
        if (debug) {
          console.log(event);
        }
      });

      // Handle Ctrl+C (SIGINT)
      const handleExit = () => {
        try {
          transcriptionClient.disconnect();
          micInstance.stop();
        } finally {
          clear();
        }
      };

      process.on("SIGINT", handleExit);

      return () => {
        micInstance.stop();
        process.off("SIGINT", handleExit);
      };
    }
  }, [debug, transcriptionClient, clear]);

  if (!process.env.OPENAI_API_KEY) {
    return <Text color="red">{"no OPENAI_API_KEY found"}</Text>;
  }

  if (isLoadingTranscriptionClient) {
    return <Text color="gree">Connecting...</Text>;
  }

  if (transcriptionClientError) {
    return <Text color="red">{transcriptionClientError.message}</Text>;
  }

  if (micError) {
    return <Text color="red">{micError}</Text>;
  }

  if (transcription) {
    return <Text color="green">Transcription: {transcription}</Text>;
  }

  return <Text>Listening for audio... Please speak into the microphone.</Text>;
};

const { clear } = render(
  <QueryClientProvider client={queryClient}>
    <App debug={false} clear={() => clear()} />
  </QueryClientProvider>,
);
