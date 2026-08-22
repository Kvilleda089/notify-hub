import type { Request } from 'express';


export interface AuthenticationRequest extends Request {
    auth: {
        projectId: string;
        apiKeyId: string;
    }
}