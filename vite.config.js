/**
 * vite.config.js
 */

import fs from "fs";
import { spawn } from "child_process";
import path from "path";

const zigSourceDir = path.resolve(__dirname, "./src/");
const rootRuntimeDir = path.resolve(__dirname, "./");
const wasmOutputPath = path.resolve(__dirname, "./bin/main.wasm");
const build_args = [
    "build-exe",
    "src/main.zig",
    "-target", "wasm32-freestanding",
    "-fno-entry",
    "--export=enter",
    "--export=step",
    "--export=exit",
    `-femit-bin=${wasmOutputPath}`
];

function zigWasmPlugin() {
    return {
        name: "zig-wasm-rebuild",

        config(config, env) {
            // Initial build if WASM doesn't exist
            if (!fs.existsSync(wasmOutputPath)) {
                const buildProcess = spawn("zig", build_args, {
                    cwd: rootRuntimeDir,
                    stdio: "inherit"
                });
                
                return new Promise((resolve, reject) => {
                    buildProcess.on("close", (code) => {
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`Zig build failed with code ${code}`));
                        }
                    });
                });
            }
        },

        configureServer(server) {
            // Watch both source and output directories
            server.watcher.add(zigSourceDir);
            server.watcher.add(path.dirname(wasmOutputPath));
        },

        handleHotUpdate({file, server}) {
            if (file.endsWith(".zig")) {
                console.log("Rebuilding Zig/WASM module...");
                
                const buildProcess = spawn("zig", build_args, {
                    cwd: rootRuntimeDir,
                    stdio: "inherit"
                });

                return new Promise((resolve) => {
                    buildProcess.on("close", (code) => {
                        if (code === 0) {
                            console.log("Zig/WASM build successful, reloading...");
                            server.ws.send({
                                type: "full-reload"
                            });
                        } else {
                            console.error(`Zig/WASM build failed with code ${code}`);
                        }
                        resolve();
                    });
                });
            }
        }
    };
}

export default {
    plugins: [
        zigWasmPlugin()
    ]
};
