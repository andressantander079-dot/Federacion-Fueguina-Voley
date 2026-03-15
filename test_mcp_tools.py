import sys
import json
import subprocess

p = subprocess.Popen(["C:\\Users\\rocio\\AppData\\Roaming\\Python\\Python314\\Scripts\\notebooklm-mcp.exe"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)

# Send init
init_req = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "test", "version": "1.0"}
    }
}
p.stdin.write(json.dumps(init_req) + '\n')
p.stdin.flush()

while True:
    line = p.stdout.readline()
    if not line: break
    resp = json.loads(line)
    if resp.get("id") == 1:
        break

# Send initialized notification
init_notif = {"jsonrpc": "2.0", "method": "notifications/initialized"}
p.stdin.write(json.dumps(init_notif) + '\n')
p.stdin.flush()

# Send tools/list request
tools_req = {"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
p.stdin.write(json.dumps(tools_req) + '\n')
p.stdin.flush()

while True:
    line = p.stdout.readline()
    if not line: break
    resp = json.loads(line)
    if resp.get("id") == 2:
        tools = resp.get("result", {}).get("tools", [])
        print(f"Total tools: {len(tools)}")
        print("Tools:", [t["name"] for t in tools])
        break

# Send list notebooks to do smoke test
smoke = {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "notebook_list", "arguments": {}}}
p.stdin.write(json.dumps(smoke) + '\n')
p.stdin.flush()

while True:
    line = p.stdout.readline()
    if not line: break
    resp = json.loads(line)
    if resp.get("id") == 3:
        print("Smoke Test Result:", json.dumps(resp.get("result", {}), indent=2))
        break

p.terminate()
