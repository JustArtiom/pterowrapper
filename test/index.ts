import Wrapdactyl from "../src";
import config from "./config";
import { setTimeout } from "node:timers/promises"
const ptero = new Wrapdactyl({
    url: config.url,
    client: config.client,
    application: config.application,
    options: {
        timeout: 7500,
        simplifyErrors: false
    }
})




const server = new ptero.client.servers.websocket("0c08a1c8");
(async () => {
    const data = await server.connect();
    
    server.on("connect", () => console.log("Connected to the server"));
    server.on("authentication", () => console.log("Authenticated successfully"))

    await data.awaitConnection();
    await data.awaitAuth();
    console.log("Authenticated successfully")
    server.power("start");
    server.requestLogs();
    server.requestStats();
    server.sendCommand("ls");

    server.on("tokenExpired", () => console.log("Token expired, disconnecting..."))
    server.on("disconnect", async() => {
        await setTimeout(1000)
        server.connect()
    })
    server.on("installCompleted", () => console.log("Installation completed"))
    server.on("backupRestoreCompleted", () => console.log("Backup restore point completed"))
    server.on("backupCompleted", () => console.log("Taking backup of the server completed"))
    server.on("deleted", () => console.log("Server has been deleted. RIP"))

    server.on("error", (data) => console.log("Error: "+ data));
    server.on("daemonError", (data) => console.log("daemonError: "+ data));
    server.on("daemonMessage", (x) => console.log(`daemonMessage: ${x}`));
    server.on("console", (x) => console.log(`Console: ${x}`));
    server.on("status", (x) => console.log(`status: ${x}`));
    // server.on("stats", (x) => console.log(`stats: ${x}`));
    server.on("transferLogs", (x) => console.log(`transferLogs: ${x}`))
    server.on("transferStatus", (x) => console.log(`transferStatus: ${x}`))
})();