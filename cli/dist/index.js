#!/usr/bin/env node
import { spawn } from 'child_process';
import * as readline from 'readline';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// Current directory for relative path resolution
const __dirname = dirname(fileURLToPath(import.meta.url));
//   Path to the MCP server (update this path as needed)
const SERVER_PATH = join(__dirname, '../../server/build/index.js');
// Function to send MCP request and receive response
async function sendMCPRequest(serverProcess, request) {
    return new Promise((resolve) => {
        let accumulatedData = '';
        const responseHandler = (data) => {
            try {
                const chunk = data.toString();
                accumulatedData += chunk;
                // Try to parse JSON responses
                try {
                    // Try to find complete JSON objects
                    const jsonStrings = accumulatedData.match(/\{.*?\}/g);
                    if (jsonStrings && jsonStrings.length > 0) {
                        for (const jsonStr of jsonStrings) {
                            const response = JSON.parse(jsonStr);
                            if (response.jsonrpc === '2.0' && (response.id === request.id || response.method === 'progress')) {
                                serverProcess.stdout.removeListener('data', responseHandler);
                                resolve(response);
                                return;
                            }
                        }
                    }
                }
                catch (jsonError) {
                    // Ignore JSON parsing errors, keep collecting data
                }
            }
            catch (error) {
                console.error('Error handling server response:', error);
            }
        };
        serverProcess.stdout.on('data', responseHandler);
        // Send the request to the server
        serverProcess.stdin.write(JSON.stringify(request) + '\n');
        // Set a timeout to resolve with whatever we have after 2 seconds
        setTimeout(() => {
            if (accumulatedData.trim()) {
                serverProcess.stdout.removeListener('data', responseHandler);
                resolve({
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: accumulatedData.trim()
                            }
                        ]
                    }
                });
            }
        }, 2000);
    });
}
async function main() {
    console.log('Starting MCP CLI...');
    // Spawn the MCP server process
    const serverProcess = spawn('node', [SERVER_PATH], {
        stdio: ['pipe', 'pipe', 'inherit']
    });
    // Handle server exit
    serverProcess.on('close', (code) => {
        console.log(`MCP Server exited with code ${code}`);
        process.exit(0);
    });
    // Set up readline interface for CLI
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'MCP> '
    });
    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('MCP CLI ready. Type "help" for available commands.');
    rl.prompt();
    // Handle CLI commands
    rl.on('line', async (line) => {
        const input = line.trim();
        if (input === 'exit' || input === 'quit') {
            console.log('Exiting MCP CLI...');
            serverProcess.kill();
            rl.close();
            return;
        }
        if (input === 'help') {
            console.log('Available commands:');
            console.log('  greet <name> - Send a greeting to the specified name');
            console.log('  zodi <question> - Ask Zodi, your friendly buddy, a question about documents');
            console.log('  listTools    - List available tools');
            console.log('  help         - Show this help message');
            console.log('  exit, quit   - Exit the CLI');
            rl.prompt();
            return;
        }
        if (input === 'listTools') {
            try {
                const request = {
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'tools/list',
                    params: {}
                };
                const response = await sendMCPRequest(serverProcess, request);
                console.log('Available tools:');
                response.result.tools.forEach((tool) => {
                    console.log(`  ${tool.name} - ${tool.description}`);
                    if (tool.inputSchema && tool.inputSchema.required && tool.inputSchema.required.length > 0) {
                        console.log('    Required parameters:', tool.inputSchema.required.join(', '));
                    }
                });
            }
            catch (error) {
                console.error('Error listing tools:', error);
            }
            rl.prompt();
            return;
        }
        // Handle greet command
        if (input.startsWith('greet ')) {
            const name = input.substring(6).trim();
            if (!name) {
                console.log('Please provide a name. Usage: greet <name>');
                rl.prompt();
                return;
            }
            try {
                const request = {
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'tools/call',
                    params: {
                        name: 'greeting',
                        arguments: {
                            name
                        }
                    }
                };
                const response = await sendMCPRequest(serverProcess, request);
                if (response.result && response.result.content) {
                    response.result.content.forEach((content) => {
                        if (content.type === 'text') {
                            console.log(content.text);
                        }
                    });
                }
                else {
                    console.log('No content in response');
                }
            }
            catch (error) {
                console.error('Error calling greeting tool:', error);
            }
            rl.prompt();
            return;
        }
        // Handle Zodi command
        if (input.startsWith('zodi ')) {
            const question = input.substring(5).trim();
            if (!question) {
                console.log('Please provide a question. Usage: zodi <question>');
                rl.prompt();
                return;
            }
            try {
                const request = {
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'tools/call',
                    params: {
                        name: 'Zodi',
                        arguments: {
                            question
                        }
                    }
                };
                const response = await sendMCPRequest(serverProcess, request);
                if (response.result && response.result.content) {
                    response.result.content.forEach((content) => {
                        if (content.type === 'text') {
                            console.log(content.text);
                        }
                    });
                }
                else if (response.result && response.result.result) {
                    console.log(response.result.result);
                }
                else {
                    console.log('No content in response');
                }
            }
            catch (error) {
                console.error('Error calling Zodi:', error);
            }
            rl.prompt();
            return;
        }
        console.log(`Unknown command: ${input}`);
        console.log('Type "help" for available commands.');
        rl.prompt();
    });
    // Handle CTRL+C
    rl.on('SIGINT', () => {
        console.log('\nExiting MCP CLI...');
        serverProcess.kill();
        rl.close();
    });
}
main().catch(error => {
    console.error('Error running MCP CLI:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map