/**
 * Type declarations for PeerJS library
 * 
 * These are minimal type declarations to satisfy TypeScript
 * while using the PeerJS library.
 */

declare module 'peerjs' {
  export interface PeerOptions {
    host?: string;
    port?: number;
    path?: string;
    secure?: boolean;
    debug?: number;
    key?: string;
    config?: RTCConfiguration;
  }

  export interface DataConnectionOptions {
    reliable?: boolean;
    serialization?: 'binary' | 'binary-utf8' | 'json' | 'none';
    metadata?: unknown;
  }

  export interface DataConnection {
    peer: string;
    open: boolean;
    metadata: unknown;
    label: string;
    serialization: string;
    reliable: boolean;
    
    send(data: unknown): void;
    close(): void;
    
    on(event: 'open', callback: () => void): void;
    on(event: 'data', callback: (data: unknown) => void): void;
    on(event: 'close', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
  }

  export interface MediaConnection {
    peer: string;
    open: boolean;
    metadata: unknown;
    
    answer(stream?: MediaStream): void;
    close(): void;
    
    on(event: 'stream', callback: (stream: MediaStream) => void): void;
    on(event: 'close', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
  }

  export default class Peer {
    id: string;
    open: boolean;
    connections: Record<string, DataConnection[]>;
    disconnected: boolean;
    destroyed: boolean;

    constructor(options?: PeerOptions);
    constructor(id: string, options?: PeerOptions);

    connect(peerId: string, options?: DataConnectionOptions): DataConnection;
    call(peerId: string, stream: MediaStream, options?: { metadata?: unknown }): MediaConnection;
    
    disconnect(): void;
    reconnect(): void;
    destroy(): void;

    on(event: 'open', callback: (id: string) => void): void;
    on(event: 'connection', callback: (connection: DataConnection) => void): void;
    on(event: 'call', callback: (call: MediaConnection) => void): void;
    on(event: 'close', callback: () => void): void;
    on(event: 'disconnected', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
  }
}