import re
base='/Users/macbookpro/Documents/Claude/'
html=open(base+'Artifacts/creches-agents-log/index.html',encoding='utf-8').read()
data=open(base+'Projects/CrechesPT/agents-log.json',encoding='utf-8').read()
pat=re.compile(r'(<script type="application/json" id="log-data">)(.*?)(</script>)',re.S)
assert pat.search(html), "tag not found"
out=pat.sub(lambda m: m.group(1)+'\n'+data.strip()+'\n'+m.group(3), html, count=1)
open(base+'Projects/CrechesPT/_tmp-agents-log.html','w',encoding='utf-8').write(out)
print('OK', len(out))
