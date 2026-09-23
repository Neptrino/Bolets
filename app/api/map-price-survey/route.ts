import { NextResponse } from "next/server";

export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store" };
const closed = (_request: Request) => {
  void _request;
  return NextResponse.json(
    { error: "L’enquesta de preu del mapa s’ha tancat." },
    { status: 410, headers },
  );
};

export const GET = closed;
export const POST = closed;
