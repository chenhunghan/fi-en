import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RealtimeTranscriptionClient } from "../RealtimeTranscriptionClient.js";
import type { RealTimeTranscriptionSession } from "../types/RealTimeTranscriptionSession.js";

export const useTranscriptionClient = ({
  apiKey,
  session,
  debug,
}: {
  apiKey: string;
  session: RealTimeTranscriptionSession;
  debug: boolean;
}) => {
  const {
    data: transcriptionClient,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transcriptionClient", apiKey, debug, session],
    queryFn: async () => {
      const _transcriptionClient = new RealtimeTranscriptionClient({
        apiKey,
        debug,
        url: "wss://api.openai.com/v1/realtime?intent=transcription",
      });
      await _transcriptionClient.connect({ session });
      return _transcriptionClient;
    },
    retry: false,
  });

  useEffect(() => {
    return () => {
      if (transcriptionClient) {
        transcriptionClient.disconnect();
      }
    };
  }, [transcriptionClient]);

  return { transcriptionClient, isLoading, error };
};
