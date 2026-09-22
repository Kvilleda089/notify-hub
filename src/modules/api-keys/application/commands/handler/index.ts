import { CreateApiKeyHandler } from "./create-api-key.handler";
import { RevokeApiKeyHandler } from "./revoke-api-key.handler";



export const ApiKeysHandlers = [
    CreateApiKeyHandler,
    RevokeApiKeyHandler,

]