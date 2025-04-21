import type Stream from "stream";
import React, { useState, useEffect } from "react";
import { render, Text } from "ink";
import mic from "mic-ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranscriptionClient } from "./hooks/useTranscriptionClient.js";
import OpenAI from "openai";

const queryClient = new QueryClient();

const openai = new OpenAI();

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
        language: "fi",
        model: "gpt-4o-mini-transcribe",
        prompt: "",
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

      transcriptionClient.onTranscriptionCompleted(async (event) => {
        const stream = await openai.chat.completions.create({
          model: "gpt-4.1-nano-2025-04-14",
          messages: [
            {
              role: "system",
              content:
                "You are a translation assistant. Translate Finnish text to English as accurately and quickly as possible.",
            },
            { role: "user", content: event.transcript },
          ],
          stream: true,
        });

        let translated = "";
        for await (const { choices } of stream) {
          const choice = choices[0];
          if (choice?.delta?.content) {
            translated = translated + choice?.delta?.content;
          }

          if (choice?.finish_reason === "stop") {
            console.log("original:", event.transcript);
            console.log("translated:", translated);
            break;
          }
        }
      });

      let delta = "";
      transcriptionClient.onDelta((event) => {
        console.log({ delta: event.delta });
        if (
          event.delta.endsWith(".") ||
          event.delta.endsWith("?") ||
          event.delta.endsWith("!")
        ) {
          delta = "";
        } else {
          delta = delta + event.delta;
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
