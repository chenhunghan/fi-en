import { RealtimeUtils } from "@openai/realtime-api-beta";
import {
  RealtimeEventHandler,
  type EventHandlerCallbackType,
} from "./RealtimeEventHandler.js";
import { RealtimeAPI } from "./RealtimeAPI.js";
import { setTimeout } from "timers/promises";
import type { RealTimeTranscriptionSession } from "./types/RealTimeTranscriptionSession.js";

export class RealtimeTranscriptionClient extends RealtimeEventHandler {
  private realtime: RealtimeAPI;
  private sessionCreated: boolean;

  constructor({
    apiKey,
    url,
    debug,
  }: {
    apiKey: string;
    url: string;
    debug?: boolean;
  }) {
    super();

    this.realtime = new RealtimeAPI({
      url,
      apiKey,
      debug,
    });
    this.sessionCreated = false;
    this.realtime.on(
      "server.transcription_session.created",
      () => (this.sessionCreated = true),
    );
  }

  onSpeechStarted(callback: {
    type: "input_audio_buffer.speech_started";
    event_id: string;
    item_id: string;
    audio_start_ms: number;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.realtime.on("input_audio_buffer.speech_started", callback as any);
  }

  onSpeechStopped(callback: {
    type: "input_audio_buffer.speech_stopped";
    event_id: string;
    item_id: string;
    audio_end_ms: number;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.realtime.on("input_audio_buffer.speech_stopped", callback as any);
  }

  onDelta(
    callback: (event: {
      type: "conversation.item.input_audio_transcription.delta";
      event_id: string;
      item_id: string;
      content_index: 0;
      delta: string;
    }) => void,
  ) {
    this.realtime.on(
      "server.conversation.item.input_audio_transcription.delta",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback as any,
    );
  }

  onTranscriptionCompleted(
    callback: (event: {
      type: "conversation.item.input_audio_transcription.completed";
      event_id: string;
      item_id: string;
      content_index: 0;
      transcript: string;
    }) => void,
  ) {
    this.realtime.on(
      "conversation.item.input_audio_transcription.completed",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback as any,
    );
  }

  onAllServerEvents(callback: EventHandlerCallbackType) {
    this.realtime.on("server.*", callback);
  }

  /**
   * Connect and set init session config
   */
  async connect({ session }: { session: RealTimeTranscriptionSession }) {
    if (this.isConnected()) {
      throw new Error(`Already connected, use .disconnect() first`);
    }
    await this.realtime.connect();
    await this.updateTranscriptionSession(session);
    return true;
  }

  async waitForSessionCreated() {
    if (!this.isConnected()) {
      throw new Error(`Not connected, use .connect() first`);
    }
    while (!this.sessionCreated) {
      await setTimeout(1);
    }
    return true;
  }

  async updateTranscriptionSession(session: RealTimeTranscriptionSession) {
    if (this.realtime.isConnected()) {
      await this.waitForSessionCreated();
      this.realtime.send("transcription_session.update", { session });
    }

    // TODO: wait for server.transcription_session.updated to resolve the promise?
    return true;
  }

  isConnected() {
    return this.realtime.isConnected();
  }

  disconnect() {
    this.sessionCreated = false;
    if (this.realtime.isConnected()) {
      this.realtime.disconnect();
    }
  }

  appendInputAudio(arrayBuffer: ArrayBuffer) {
    if (arrayBuffer.byteLength > 0) {
      // Send this event to append audio bytes to the input audio buffer. The audio buffer is temporary storage you can write to and later commit. In Server VAD mode, the audio buffer is used to detect speech and the server will decide when to commit. When Server VAD is disabled, you must commit the audio buffer manually.
      //
      // The client may choose how much audio to place in each event up to a maximum of 15 MiB, for example streaming smaller chunks from the client may allow the VAD to be more responsive. Unlike made other client events, the server will not send a confirmation response to this event.
      this.realtime.send("input_audio_buffer.append", {
        audio: RealtimeUtils.arrayBufferToBase64(arrayBuffer),
      });
    }
    return true;
  }
}
