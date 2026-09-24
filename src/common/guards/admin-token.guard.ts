import { CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { env } from "src/config";


export class AdminTokenGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean  {
        const request = context.switchToHttp().getRequest();
        const adminToken = request.header('x-admin-token');

        const provided = Buffer.from(adminToken ?? '');
        const expected = Buffer.from(env.admin_api_token);

        const isValid = provided.length === expected.length &&
                            timingSafeEqual(provided, expected);

        if(!isValid ){
            throw new UnauthorizedException(`Invalid Administrator token. `)
        }

        return true;
    }
}