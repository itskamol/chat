/**
 * @file loggingMiddleware.ts
 * @description Defines a basic request logging middleware for Express.
 * This middleware logs details of incoming requests and their responses.
 */
import { Request, Response, NextFunction } from 'express';

/**
 * @function loggingMiddleware
 * @description Express middleware to log incoming requests and outgoing responses.
 * Logs include: timestamp, HTTP method, URL, IP address, User-Agent, request body (for certain methods, summarized),
 * and response status code.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const { method, url, ip, headers } = req; // ip is available if app.set('trust proxy', true) is used and there's a proxy
  const userAgent = headers['user-agent'] || 'N/A'; // Get User-Agent header

  // Log basic request information
  console.log(`[Request] ${timestamp} | ${method} ${url} | IP: ${ip || 'N/A'} | User-Agent: "${userAgent}"`);

  // Log request body for specific methods, being mindful of sensitive data and body size
  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    // In a real application, avoid logging sensitive fields (e.g., passwords, tokens).
    // Consider redacting fields or logging only non-sensitive parts.
    // Also, be cautious with very large request bodies.
    try {
      const bodyString = JSON.stringify(req.body);
      if (bodyString.length > 500) { // Arbitrary limit for log size
        console.log(`[Request Body] ${timestamp} | ${method} ${url} | Body: (Too large to log fully, size: ${bodyString.length})`);
      } else {
        console.log(`[Request Body] ${timestamp} | ${method} ${url} | Body: ${bodyString}`);
      }
    } catch (e) {
      console.warn(`[Request Body] ${timestamp} | ${method} ${url} | Body: (Could not stringify body for logging)`);
    }
  }
  
  // Attach an event listener to the response object to log when it finishes
  res.on('finish', () => {
    const endTime = new Date().toISOString();
    // Log response status
    console.log(`[Response] ${endTime} | ${method} ${url} | Status: ${res.statusCode} | IP: ${ip || 'N/A'}`);
  });

  // Call the next middleware in the stack
  next();
};
