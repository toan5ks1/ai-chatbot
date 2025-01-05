import { getChatById, saveChat } from "@/lib/db/queries";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Chat id is required" }, { status: 400 });
  }

  try {
    const chat = await getChatById({ id });
    return NextResponse.json({
      success: true,
      data: chat,
      message: "Get chat successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, title } = body;

    if (!id || !userId || !title) {
      return NextResponse.json(
        { error: "id, userId, and title is required" },
        { status: 400 }
      );
    }

    await saveChat({ id, userId, title });
    return NextResponse.json({
      success: true,
      message: "Save chat successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
