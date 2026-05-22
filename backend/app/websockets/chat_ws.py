"""
WebSocket endpoint for real-time streaming chat responses.
"""
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token

router = APIRouter()


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    token = websocket.query_params.get("token")
    payload = decode_token(token or "")
    if not payload:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # TODO: pipe through RAGPipeline.stream() and send chunks
            await websocket.send_text(json.dumps({"type": "ack", "message": message.get("content", "")}))
    except WebSocketDisconnect:
        pass
