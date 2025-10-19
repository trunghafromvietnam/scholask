# smoke_bedrock.py
import os, json, boto3
from dotenv import load_dotenv
load_dotenv()

REGION = os.getenv("BEDROCK_REGION","us-west-2")
CLAUDE = os.getenv("BEDROCK_CLAUDE_MODEL_ID","anthropic.claude-3-5-sonnet-20240620-v1:0")
EMBED  = os.getenv("BEDROCK_EMBED_MODEL_ID","amazon.titan-embed-text-v2:0")

br = boto3.client("bedrock-runtime", region_name=REGION)

def test_embed():
    body = {"inputText": "Hello from Scholask", "dimensions": 1024}  # dimensions hợp lệ cho V2
    r = br.invoke_model(
        modelId=EMBED,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    p = json.loads(r["body"].read())
    vec = p.get("embedding") or p.get("vector")
    assert vec and isinstance(vec, list), "No embedding returned"
    print(f"✅ Titan embeddings OK — dim={len(vec)}")

def test_claude():
    body = {
        "anthropic_version":"bedrock-2023-05-31",
        "system": "Say 'Claude OK' if you can read this.",
        "messages":[{"role":"user","content":[{"type":"text","text":"Ping"}]}],
        "max_tokens": 50,
        "temperature": 0
    }
    r = br.invoke_model(
        modelId=CLAUDE,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    p = json.loads(r["body"].read())
    txt = "".join(c.get("text","") for c in p.get("content",[]) if c.get("type")=="text") or p.get("output_text","")
    print("✅ Claude reply:", txt[:200])

if __name__=="__main__":
    print("Region:", REGION)
    print("Claude model:", CLAUDE)
    print("Embed model:", EMBED)
    try:
        test_embed()
    except Exception as e:
        print("❌ Embeddings error:", e)
        print("→ Kiểm tra: quyền Titan V2 đã bật, modelId có ':0', và REGION đúng.")
        raise
    try:
        test_claude()
    except Exception as e:
        print("❌ Claude error:", e)
        print("→ Kiểm tra: đã bật access đúng phiên bản Claude, modelId có suffix như '...-v1:0' hoặc '...-v2:0', hoặc dùng Inference Profile ARN nếu Interregional.")
        raise

