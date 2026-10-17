import { randomBytes, createHash } from "node:crypto";
import { teamUser } from "@/lib/auth";
export const validKinds=["closure","schedule","transport","safety","business"] as const;
export const validStatuses=["received","reviewing","assigned","resolved","closed"] as const;
export const adminUser=teamUser;
export function jsonError(message:string,status=400){return Response.json({error:message},{status});}
export function sameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return true;try{const originUrl=new URL(origin);const requestHost=request.headers.get("host")||new URL(request.url).host;return originUrl.host===requestHost&&(originUrl.protocol==="http:"||originUrl.protocol==="https:");}catch{return false;}}
export function trim(value:unknown,max=500){return typeof value==="string"?value.trim().slice(0,max):"";}
export async function readJsonObject(request:Request):Promise<Record<string,unknown>|null>{const value:unknown=await request.json().catch(()=>null);return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;}
export function isEmail(value:string){return !value||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
export function randomHex(bytes=8){return randomBytes(bytes).toString("hex");}
export async function sha256(value:string){return createHash("sha256").update(value).digest("hex");}
