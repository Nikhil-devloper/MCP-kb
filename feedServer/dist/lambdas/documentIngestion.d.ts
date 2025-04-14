import { DynamoDBStreamEvent, Context, Callback } from 'aws-lambda';
export declare const handler: (event: DynamoDBStreamEvent, context: Context, callback: Callback) => Promise<void>;
