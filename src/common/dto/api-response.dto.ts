


export class ApiResponseDto<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        details?: unknown;
    };
    meta: {
        timestamp: string;
    };
}