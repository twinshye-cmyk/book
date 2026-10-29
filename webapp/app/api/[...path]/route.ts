import { env } from 'cloudflare:workers';
import { handle } from '../../../lib/server';
export const dynamic='force-dynamic';
export const GET=(req:Request)=>handle(req,env as any);
export const POST=GET;
export const PATCH=GET;
