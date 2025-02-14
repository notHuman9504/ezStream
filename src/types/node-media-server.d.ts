declare module 'node-media-server' {
  class NodeMediaServer {
    constructor(config: any);
    run(): void;
    on(event: string, callback: (id: string, args: any) => void): void;
  }
  export default NodeMediaServer;
} 