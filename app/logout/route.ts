import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
export const runtime="nodejs";
export async function GET(request:Request){await destroySession();return NextResponse.redirect(new URL("/",request.url));}
