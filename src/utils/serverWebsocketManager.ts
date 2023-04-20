import WebSocket from "ws";
import { EventEmitter } from "events";
import Wrapdactyl from "..";
import { serverWebsocketManagerConfig, serverWebsocketManagerEvents } from "../types";

declare interface BaseServerWebsocketManager {
    on<U extends keyof serverWebsocketManagerEvents>(
      event: U, listener: serverWebsocketManagerEvents[U]
    ): this;
  
    emit<U extends keyof serverWebsocketManagerEvents>(
      event: U, ...args: Parameters<serverWebsocketManagerEvents[U]>
    ): boolean;
}
  
class BaseServerWebsocketManager extends EventEmitter {
    constructor() {
        super()
    }
}

export default (Wrapdactyl: Wrapdactyl) => class serverWebsocketManager extends BaseServerWebsocketManager {
    constructor(identifier: string) {
        super();
        Object.defineProperty(this, "config", {
            enumerable: false
        })

        this.identifier = identifier;
    }

    identifier: string = "";
    config: serverWebsocketManagerConfig = { origin: Wrapdactyl.config.url };
    ws?: WebSocket;

    connect = async () => {
        if(this.ws) throw new Error("Wrapdactyl - the websocket is still in connected state")

        const creds = await Wrapdactyl.client.servers.websocketDetails(this.identifier);
        this.config.socket = creds.data.socket
        this.config.token = creds.data.token

        this.ws = new WebSocket(this.config.socket, { origin: this.config.origin });

        this.ws.on("open", () => {
            this.auth(this.config.token);
            this.emit("connect")
        })

        this.ws.on('message', async (data) => {
            let message = JSON.parse(data.toString())
            if(message.event === 'auth success') {
                this.emit("authentication")
            } else if(message.event === 'daemon message') {
                for(let arg of message.args) this.emit('daemonMessage', arg)
            } else if(message.event === 'install output') {
                for(let arg of message.args) this.emit('installMessage', arg)
            } else if(message.event === 'install started') {
                this.emit("installStarted")
            } else if(message.event === 'install completed') {
                this.emit("installCompleted")
            } else if(message.event === 'console output') {
                message.args = message.args.map((x: string) => x.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''))
                for(let arg of message.args) this.emit('console', arg)
            } else if(message.event === 'status') {
                for(let arg of message.args) this.emit('status', arg)
            } else if(message.event === 'stats') {
                message.args = message.args.map((x: string) => JSON.parse(x))
                for(let arg of message.args) this.emit('stats', arg);
            } else if(message.event === 'backup restore completed') {
                this.emit("backupRestoreCompleted")
            } else if(message.event === 'backup completed') {
                this.emit("backupCompleted")
            } else if(message.event === 'transfer logs') {
                for(let arg of message.args) this.emit('transferLogs', arg);
            } else if(message.event === 'transfer status') {
                for(let arg of message.args) this.emit('transferStatus', arg);
            } else if(message.event === 'deleted') {
                this.emit('deleted');
            } else if(message.event === 'token expiring') {
                const creds = await Wrapdactyl.client.servers.websocketDetails(this.identifier).catch(() => {});
                if(creds) this.auth(creds.data.token);
            } else if(message.event === 'token expired') {
                this.emit("tokenExpired")
            } else if(message.event === 'daemon error') {
                for(let arg of message.args) this.emit("daemonError", arg)
            } else if(message.event === 'jwt error') {
                for(let arg of message.args) this.emit("error", arg)
            } else console.log(message) // Testing stage
        });
        this.ws.on('error', (data) => this.emit("error", data.toString()))
        this.ws.on('close', async () => {
            this.ws = undefined
            this.emit("disconnect")
        })

        return {
            awaitConnection: (): Promise<string> => new Promise((resolve, _) => {
                this.ws?.once("open", () => resolve("connected"))
            }),
            awaitAuth: (): Promise<string> => new Promise((resolve, _) => {
                this.ws?.on('message', async (data) => {
                    let message = JSON.parse(data.toString())
                    if(message.event === 'auth success') {
                        resolve("authenticated")
                    }
                })
            })
        }
    }
    
    disconnect = this.ws?.close;

    auth = (token?: string) => {
        if(!token) return false
        if(!this.ws) throw new Error("Wrapdactyl - the websocket is not connected yet")

        this.ws.send(JSON.stringify({"event": "auth", "args": [token]}))
        return true
    }

    requestStats = () => {
        if(!this.ws) throw new Error("Wrapdactyl - the websocket is not connected yet")
        this.ws.send(JSON.stringify({"event": "send stats", "args": [null]}))
    }

    requestLogs = () => {
        if(!this.ws) throw new Error("Wrapdactyl - the websocket is not connected yet")
        this.ws.send(JSON.stringify({"event": "send logs", "args": [null]}))
    }

    power = (power: "start" | "stop" | "restart" | "kill") => {
        if(!this.ws) throw new Error("Wrapdactyl - the websocket is not connected yet")
        if(!["start", "stop", "restart", "kill"].includes(power.toLowerCase())) throw new Error("Wrapdactyl - Invalid power method");
        this.ws.send(JSON.stringify({"event": "set state", "args": [power]}))
    }
    
    sendCommand = (command: string) => {
        if(!this.ws) throw new Error("Wrapdactyl - the websocket is not connected yet")
        this.ws.send(JSON.stringify({"event": "send command", "args": [command]}))
    }
}