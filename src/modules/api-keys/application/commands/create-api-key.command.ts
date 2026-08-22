

export class CreateApiKeyCommand {
    constructor(
        public readonly projectId: string,
        public readonly name: string,
    ){}
}