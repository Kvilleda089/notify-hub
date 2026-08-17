import { CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { env } from "src/config";


export class AdminTokenGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean  {
        const request = context.switchToHttp().getRequest();
        const adminToken = request.header('x-admin-token');

        if(!adminToken || adminToken !== env.admin_api_token ){
            throw new UnauthorizedException(`Invalid Administrator token. `)
        }

        return true;
    }
}