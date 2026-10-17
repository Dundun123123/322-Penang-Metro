import fs from "node:fs";
import path from "node:path";
import { getDb,localDataDirectory } from "@/db";
import { getLocalUser,teamUser } from "@/lib/auth";
import { jsonError,trim } from "@/lib/server";
export const runtime="nodejs";
export async function GET(request:Request){const reference=trim(new URL(request.url).searchParams.get("reference"),40).toUpperCase();const row=getDb().prepare(`SELECT owner_user_id AS ownerUserId,photo_key AS photoKey,photo_type AS photoType FROM reports WHERE reference=?`).get(reference) as {ownerUserId:string|null;photoKey:string|null;photoType:string|null}|undefined;if(!row?.photoKey)return jsonError("Photo not found",404);const user=await getLocalUser();if(!(await teamUser())&&(!user||row.ownerUserId!==user.id))return jsonError("Forbidden",403);const filename=path.join(localDataDirectory,"uploads",path.basename(row.photoKey));if(!fs.existsSync(filename))return jsonError("Photo not found",404);return new Response(fs.readFileSync(filename),{headers:{"Content-Type":row.photoType||"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});}
