import { WebSocketServer, type WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import type { RawHassEntity } from '../../src/ha/normalize.js';

export interface MockHaOptions {
  token: string;
  states?: RawHassEntity[];
  areas?: unknown[];
  devices?: unknown[];
  entityRegistry?: unknown[];
}

/**
 * A minimal but wire-accurate Home Assistant WebSocket server, good enough for
 * `home-assistant-js-websocket` to authenticate, fetch states + registries, and
 * subscribe to events. Unknown commands are acked with an empty success result
 * so the mock survives library version differences (e.g. supported_features).
 */
export class MockHaServer {
  private wss: WebSocketServer;
  private sockets = new Set<WebSocket>();
  /** Subscription id used by the client for state_changed events. */
  private stateChangedSubId: number | null = null;
  private calls: Array<{ domain: string; service: string; serviceData: unknown; target: unknown }> = [];

  getServiceCalls(): ReadonlyArray<{ domain: string; service: string; serviceData: unknown; target: unknown }> {
    return this.calls;
  }

  private constructor(
    private readonly opts: MockHaOptions,
    port: number,
  ) {
    this.wss = new WebSocketServer({ port, path: '/api/websocket' });
    this.wss.on('connection', (socket) => this.handleConnection(socket));
  }

  static async start(opts: MockHaOptions): Promise<MockHaServer> {
    const server = new MockHaServer(opts, 0);
    await new Promise<void>((resolve) => server.wss.once('listening', resolve));
    return server;
  }

  /** Base HTTP url for createLongLivedTokenAuth, e.g. http://127.0.0.1:PORT */
  get url(): string {
    const { port } = this.wss.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  /** Push a state_changed event to all subscribed clients. */
  emitStateChanged(
    entityId: string,
    newState: RawHassEntity | null,
    oldState: RawHassEntity | null = null,
  ): void {
    if (this.stateChangedSubId === null) return;
    const event = {
      id: this.stateChangedSubId,
      type: 'event',
      event: {
        event_type: 'state_changed',
        data: { entity_id: entityId, new_state: newState, old_state: oldState },
        time_fired: new Date().toISOString(),
        origin: 'LOCAL',
      },
    };
    for (const socket of this.sockets) socket.send(JSON.stringify(event));
  }

  async stop(): Promise<void> {
    for (const s of this.sockets) s.close();
    await new Promise<void>((resolve, reject) =>
      this.wss.close((err) => (err ? reject(err) : resolve())),
    );
  }

  private handleConnection(socket: WebSocket): void {
    this.sockets.add(socket);
    socket.on('close', () => this.sockets.delete(socket));
    socket.send(JSON.stringify({ type: 'auth_required', ha_version: '2026.1.0' }));

    socket.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      this.handleMessage(socket, msg);
    });
  }

  private handleMessage(
    socket: WebSocket,
    msg: Record<string, unknown>,
  ): void {
    const send = (obj: unknown): void => socket.send(JSON.stringify(obj));
    const id = msg.id as number | undefined;

    if (msg.type === 'auth') {
      if (msg.access_token === this.opts.token) {
        send({ type: 'auth_ok', ha_version: '2026.1.0' });
      } else {
        send({ type: 'auth_invalid', message: 'bad token' });
      }
      return;
    }

    const result = (value: unknown): void =>
      send({ id, type: 'result', success: true, result: value });

    switch (msg.type) {
      case 'get_states':
        result(this.opts.states ?? []);
        return;
      case 'config/area_registry/list':
        result(this.opts.areas ?? []);
        return;
      case 'config/device_registry/list':
        result(this.opts.devices ?? []);
        return;
      case 'config/entity_registry/list':
        result(this.opts.entityRegistry ?? []);
        return;
      case 'subscribe_events':
        if (msg.event_type === 'state_changed' && typeof id === 'number') {
          this.stateChangedSubId = id;
        }
        result(null);
        return;
      case 'call_service':
        this.calls.push({
          domain: msg.domain as string,
          service: msg.service as string,
          serviceData: msg.service_data,
          target: msg.target,
        });
        result(null);
        return;
      case 'ping':
        send({ id, type: 'pong' });
        return;
      default:
        // Ack anything else (supported_features, other subscriptions, etc.)
        if (typeof id === 'number') result(null);
        return;
    }
  }
}
