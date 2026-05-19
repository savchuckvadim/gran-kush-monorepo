import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class MemberLocalAuthGuard extends AuthGuard("member-local") {}
