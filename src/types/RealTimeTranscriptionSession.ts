// https://platform.openai.com/docs/api-reference/realtime-client-events/transcription_session
// https://platform.openai.com/docs/guides/speech-to-text#streaming-the-transcription-of-an-ongoing-audio-recording
export type RealTimeTranscriptionSession = {
  input_audio_format: "pcm16";
  input_audio_noise_reduction: null | { type: "near_field" | "far_field" };
  input_audio_transcription: {
    /**
     * the input language in ISO-639-1 (e.g. en)
     */
    language: string;
    /**
     * The model to use for transcription, "whisper-1" not support for realtime transcription
     */
    model: "gpt-4o-transcribe" | "gpt-4o-mini-transcribe";
    /**
     * An optional text to guide the model's style or continue a previous audio segment. The prompt is a free text string, for example "expect words related to technology".
     */
    prompt: string;
  };
  /**
   * Configuration for turn detection. Can be set to null to turn off. Server VAD means that the model will detect the start and end of speech based on audio volume and respond at the end of user speech.
   */
  turn_detection: null | {
    type: "server_vad";
    /**
     * Activation threshold for VAD (0.0 to 1.0), this defaults to 0.5. A higher threshold will require louder audio to activate the model, and thus might perform better in noisy environments.
     */
    threshold: number;
    /**
     * Amount of audio to include before the VAD detected speech (in milliseconds). Defaults to 300ms.
     */
    prefix_padding_ms: number;
    /**
     * Duration of silence to detect speech stop (in milliseconds). Defaults to 500ms. With shorter values the model will respond more quickly, but may jump in on short pauses from the user.
     */
    silence_duration_ms: number;
  };
};
