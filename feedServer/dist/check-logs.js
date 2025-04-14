"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_cloudwatch_logs_1 = require("@aws-sdk/client-cloudwatch-logs");
// Configuration
const region = "ap-south-1";
const documentIngestionLogGroup = "/aws/lambda/knowledge-base-api-dev-documentIngestion";
const questionProcessorLogGroup = "/aws/lambda/knowledge-base-api-dev-questionProcessor";
// Initialize CloudWatch Logs client
const client = new client_cloudwatch_logs_1.CloudWatchLogsClient({ region });
// Function to get the most recent log stream
async function getLatestLogStream(logGroupName) {
    try {
        const command = new client_cloudwatch_logs_1.DescribeLogStreamsCommand({
            logGroupName,
            orderBy: "LastEventTime",
            descending: true,
            limit: 1
        });
        const response = await client.send(command);
        if (response.logStreams && response.logStreams.length > 0) {
            return response.logStreams[0].logStreamName;
        }
        return null;
    }
    catch (error) {
        console.error(`Error getting log streams for ${logGroupName}:`, error);
        return null;
    }
}
// Function to get log events from a log stream
async function getLogEvents(logGroupName, logStreamName) {
    try {
        const command = new client_cloudwatch_logs_1.GetLogEventsCommand({
            logGroupName,
            logStreamName,
            limit: 50,
            startFromHead: false // Get the most recent events first
        });
        const response = await client.send(command);
        return response.events || [];
    }
    catch (error) {
        console.error(`Error getting log events for ${logGroupName}/${logStreamName}:`, error);
        return [];
    }
}
// Function to display log events
function displayLogEvents(logGroupName, events) {
    console.log(`\n===== ${logGroupName} =====`);
    if (events.length === 0) {
        console.log("No log events found");
        return;
    }
    // Sort events by timestamp (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp);
    // Display the most recent events
    for (let i = 0; i < Math.min(events.length, 20); i++) {
        const event = events[i];
        const time = new Date(event.timestamp).toISOString();
        console.log(`[${time}] ${event.message}`);
    }
}
// Main function to check logs
async function checkLogs() {
    console.log("Checking Lambda logs in CloudWatch...");
    // Check document ingestion logs
    console.log("\nChecking document ingestion Lambda logs...");
    const ingestionStreamName = await getLatestLogStream(documentIngestionLogGroup);
    if (ingestionStreamName) {
        console.log(`Found log stream: ${ingestionStreamName}`);
        const ingestionEvents = await getLogEvents(documentIngestionLogGroup, ingestionStreamName);
        displayLogEvents(documentIngestionLogGroup, ingestionEvents);
    }
    else {
        console.log("No log streams found for document ingestion Lambda");
    }
    // Check question processor logs
    console.log("\nChecking question processor Lambda logs...");
    const processorStreamName = await getLatestLogStream(questionProcessorLogGroup);
    if (processorStreamName) {
        console.log(`Found log stream: ${processorStreamName}`);
        const processorEvents = await getLogEvents(questionProcessorLogGroup, processorStreamName);
        displayLogEvents(questionProcessorLogGroup, processorEvents);
    }
    else {
        console.log("No log streams found for question processor Lambda");
    }
}
// Run the log check
checkLogs().catch(error => {
    console.error("Error checking logs:", error);
});
//# sourceMappingURL=check-logs.js.map