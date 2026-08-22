import { Injectable } from "@nestjs/common";
import { createHmac, randomBytes } from "crypto";
import { env } from "src/config";

@Injectable()
export class ApiKeyGeneratorService {
    generate(){
        const identifier = randomBytes(6).toString('hex');
        const secret = randomBytes(32).toString('base64url');

        const rawKey  = `ntf_live_${identifier}_${secret}`;
        const prefix = `ntf_live_${identifier}`;

        return {
            rawKey,
            prefix,
        }
    }

    hash(rawKey: string): string {
        
        return createHmac('sha256', env.api_key_pepper)
                    .update(rawKey)
                    .digest('hex')
    }
}