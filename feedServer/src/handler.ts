import serverless from 'serverless-http';
import app from './app';

// Export the handler function
export const handler = serverless(app); 