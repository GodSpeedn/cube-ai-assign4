#!/usr/bin/env python3
"""
Test script to verify WebSocket functionality for real-time agent communication
"""

import asyncio
import websockets
import json
import time

async def test_websocket():
    """Test WebSocket connection and message handling"""
    uri = "ws://localhost:8000/ws"
    
    try:
        print("🔗 Connecting to WebSocket...")
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Send a test message
            test_message = {
                "type": "test",
                "message": "Hello from test client"
            }
            await websocket.send(json.dumps(test_message))
            print("📤 Sent test message")
            
            # Listen for messages for 10 seconds
            print("👂 Listening for messages...")
            start_time = time.time()
            while time.time() - start_time < 10:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"📨 Received: {data}")
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    print(f"❌ Error receiving message: {e}")
                    break
            
            print("✅ WebSocket test completed")
            
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
