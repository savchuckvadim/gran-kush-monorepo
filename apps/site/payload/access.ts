import type { Access, AccessArgs } from "payload";

export const anyone: Access = () => true;

export const authenticated = ({ req: { user } }: AccessArgs): boolean => Boolean(user);
