import { RealtimeUtils } from "@openai/realtime-api-beta";
import { RealtimeEventHandler } from "./RealtimeEventHandler.js";
import { WebSocket } from "ws";

export class RealtimeAPI extends RealtimeEventHandler {
  private debug: boolean;
  private url: string;
  private apiKey: string;
  private ws: WebSocket | null;
  /**
   * Create a new RealtimeAPI instance
   * @param {{url?: string, apiKey?: string, debug?: boolean}} [settings]
   * @returns {RealtimeAPI}
   */
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
    this.url = url;
    this.apiKey = apiKey;
    if (!this.apiKey) {
      throw new Error("missing api key");
    }
    this.debug = !!debug;
    this.ws = null;
  }

  /**
   * Tells us whether or not the WebSocket is connected
   * @returns {boolean}
   */
  isConnected(): boolean {
    return !!this.ws;
  }

  /**
   * Writes WebSocket logs to console
   * @param  {...any} args
   * @returns {true}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(...args: any[]): true {
    const date = new Date().toISOString();
    const logs = [`[Websocket/${date}]`].concat(args).map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        return JSON.stringify(arg, null, 2);
      } else {
        return arg;
      }
    });
    if (this.debug) {
      console.log(...logs);
    }
    return true;
  }

  async connect(): Promise<boolean> {
    if (!this.apiKey && this.url) {
      console.warn(`No apiKey provided for connection to "${this.url}"`);
    }
    if (this.isConnected()) {
      throw new Error(`Already connected`);
    }

    const ws = new WebSocket(this.url, [], {
      finishRequest: (request) => {
        request.setHeader("Authorization", `Bearer ${this.apiKey}`);
        request.setHeader("OpenAI-Beta", "realtime=v1");
        request.end();
      },
    });
    ws.on("message", (data: Buffer) => {
      const message = JSON.parse(data.toString());
      this.receive(message.type, message);
    });
    return new Promise((resolve, reject) => {
      const connectionErrorHandler = () => {
        this.disconnect(ws);
        reject(new Error(`Could not connect to "${this.url}"`));
      };
      ws.on("error", connectionErrorHandler);
      ws.on("open", () => {
        this.log(`Connected to "${this.url}"`);
        ws.removeListener("error", connectionErrorHandler);
        ws.on("error", () => {
          this.disconnect(ws);
          this.log(`Error, disconnected from "${this.url}"`);
          this.dispatch("close", { error: true });
        });
        ws.on("close", () => {
          this.disconnect(ws);
          this.log(`Disconnected from "${this.url}"`);
          this.dispatch("close", { error: false });
        });
        this.ws = ws;
        resolve(true);
      });
    });
  }

  /**
   * Disconnects from Realtime API server
   * @param {WebSocket} [ws]
   * @returns {true}
   */
  disconnect(ws?: WebSocket): boolean {
    if (!ws || this.ws === ws) {
      if (this.ws) {
        this.ws.close();
      }
      this.ws = null;
      return true;
    }

    return false;
  }

  /**
   * Receives an event from WebSocket and dispatches as "server.{eventName}" and "server.*" events
   * @param {string} eventName
   * @param {{[key: string]: any}} event
   * @returns {true}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receive(eventName: string, event: { [key: string]: any }): boolean {
    this.log(`received:`, eventName, event);
    this.dispatch(`server.${eventName}`, event);
    this.dispatch("server.*", event);
    return true;
  }

  /**
   * Sends an event to WebSocket and dispatches as "client.{eventName}" and "client.*" events
   * @param {string} eventName
   * @param {{[key: string]: any}} event
   * @returns {true}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(eventName: string, data: { [key: string]: any }): boolean {
    if (!this.isConnected()) {
      throw new Error(`RealtimeAPI is not connected`);
    }
    data = data || {};
    if (typeof data !== "object") {
      throw new Error(`data must be an object`);
    }
    const event = {
      event_id: RealtimeUtils.generateId("evt_"),
      type: eventName,
      ...data,
    };
    this.dispatch(`client.${eventName}`, event);
    this.dispatch("client.*", event);
    this.log(`sent:`, eventName, event);
    if (this.ws) {
      this.ws.send(JSON.stringify(event));
    }
    return true;
  }
}
