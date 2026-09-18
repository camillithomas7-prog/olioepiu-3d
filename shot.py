import base64, json, subprocess, time, urllib.request, sys, pathlib, websocket
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; PORT=9430
OUT=pathlib.Path("/private/tmp/claude-501/-Users-thomaspc/7962da05-584f-4604-a86c-35aa815852f5/scratchpad/shots_oe"); OUT.mkdir(parents=True,exist_ok=True)
mode=sys.argv[1]; stops=[float(x) for x in sys.argv[2].split(",")]
W,H,mob=(1440,900,False) if mode=="d" else (390,844,True)
p=subprocess.Popen([CH,"--headless=new","--remote-debugging-port=%d"%PORT,"--hide-scrollbars","--no-first-run","--use-angle=metal","--enable-gpu","--ignore-gpu-blocklist","--user-data-dir="+str(OUT/"prof"),"--remote-allow-origins=*"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
  for _ in range(40):
    try: v=json.load(urllib.request.urlopen("http://127.0.0.1:%d/json/list"%PORT)); break
    except Exception: time.sleep(.4)
  pg=[x for x in v if x["type"]=="page"][0]
  ws=websocket.create_connection(pg["webSocketDebuggerUrl"],timeout=60); n=[0]
  def s(m,**pa):
    n[0]+=1; ws.send(json.dumps({"id":n[0],"method":m,"params":pa}))
    while True:
      r=json.loads(ws.recv())
      if r.get("id")==n[0]: return r.get("result",{})
      if r.get("method") in ("Runtime.consoleAPICalled","Runtime.exceptionThrown"): print("CONSOLE", json.dumps(r["params"])[:600])
  s("Runtime.enable")
  s("Emulation.setDeviceMetricsOverride",width=W,height=H,deviceScaleFactor=1 if not mob else 2,mobile=mob)
  if mob: s("Emulation.setTouchEmulationEnabled",enabled=True)
  s("Page.navigate",url="http://127.0.0.1:8630/?v=%d"%time.time()); time.sleep(9)
  for st in stops:
    s("Runtime.evaluate",expression="window.scrollTo(0,%f*innerHeight)"%st); time.sleep(3.5)
    img=s("Page.captureScreenshot",format="jpeg",quality=70)["data"]
    f=OUT/("%s_%05.1f.jpg"%(mode,st)); f.write_bytes(base64.b64decode(img)); print(f)
  r=s("Runtime.evaluate",expression="JSON.stringify([document.body.scrollHeight/innerHeight, window.__errs||[]])",returnByValue=True); print(r)
finally: p.terminate()
