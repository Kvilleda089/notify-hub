import { ICommand } from "@nestjs/cqrs";



export class RevokeApiKeyCommand implements ICommand {
    constructor(
        public readonly apiKeyId: string,
    ){}
}